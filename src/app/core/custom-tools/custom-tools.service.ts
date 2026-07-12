import { Service, computed, inject, signal } from '@angular/core';
import { idbDelete, idbGetAll, idbPut, openDb } from '../storage/indexeddb.helpers';
import { ToolRegistry } from '../registry/tool-registry';
import type { ToolManifest } from '../registry/tool-descriptor';
import { specToDeclaration } from './custom-tool-declaration';
import { MAX_CUSTOM_TOOLS, isValidCustomToolSpec, type CustomToolSpec } from './custom-tool.types';
import { LoggerService } from '../logging/logger.service';
import { normalizeStorageError } from '../errors/normalize-error';

const DB_NAME = 'atlas-custom-tools';
const DB_VERSION = 1;
const STORE = 'tools';

@Service()
export class CustomToolsService {
  private readonly registry = inject(ToolRegistry);
  private readonly logger = inject(LoggerService);

  private dbPromise: Promise<IDBDatabase> | null = null;
  private readonly _specs = signal<readonly CustomToolSpec[]>([]);
  private readonly _unavailable = signal(false);
  private readonly _loaded = signal(false);

  readonly specs = this._specs.asReadonly();
  readonly unavailable = this._unavailable.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly count = computed(() => this._specs().length);
  // Exposed so the agent loop can union custom tools into declarations — otherwise they stay invisible to the model.
  readonly customToolNames = computed<ReadonlySet<string>>(
    () => new Set(this._specs().map((s) => s.name)),
  );

  async load(): Promise<void> {
    if (this._loaded()) return;
    try {
      const db = await this.db();
      const stored = await idbGetAll<unknown>(db, STORE);
      // Validate every row; never shadow a built-in; cap total so a poisoned store cannot register unbounded tools.
      const sorted = [...stored].filter(isValidCustomToolSpec).sort(byCreatedDesc);
      const kept: CustomToolSpec[] = [];
      const seen = new Set<string>();
      for (const spec of sorted) {
        if (kept.length >= MAX_CUSTOM_TOOLS) break;
        if (seen.has(spec.name)) continue;
        if (this.registry.get(spec.name)) continue;
        seen.add(spec.name);
        this.registry.upsert(this.buildManifest(spec));
        kept.push(spec);
      }
      this._specs.set(kept);
    } catch (err) {
      // Persistence is graceful-degradation: flag `unavailable` and log rather than block the session.
      this._unavailable.set(true);
      const appError = normalizeStorageError(err, { feature: 'custom-tools', op: 'load' });
      this.logger.warn(appError.technicalMessage, {
        category: appError.category,
        context: { feature: 'custom-tools', op: 'load' },
        error: appError.cause ?? err,
      });
    } finally {
      this._loaded.set(true);
    }
  }

  async save(spec: CustomToolSpec): Promise<void> {
    const db = await this.db();
    await idbPut(db, STORE, spec);
    this._specs.update((list) =>
      [spec, ...list.filter((s) => s.id !== spec.id)].sort(byCreatedDesc),
    );
    this.registry.upsert(this.buildManifest(spec));
  }

  finalizeDraft(draft: Omit<CustomToolSpec, 'id' | 'createdAt' | 'updatedAt'>): CustomToolSpec {
    const now = Date.now();
    return { ...draft, id: randomId(), createdAt: now, updatedAt: now };
  }

  // Session-only registration when persistence is unavailable — skips IndexedDB.
  registerEphemeral(spec: CustomToolSpec): void {
    this._specs.update((list) =>
      [spec, ...list.filter((s) => s.id !== spec.id)].sort(byCreatedDesc),
    );
    this.registry.upsert(this.buildManifest(spec));
  }

  // Registry-only replay rehydration — no `specs` signal or IndexedDB; live tools always win.
  ensureRegisteredForReplay(spec: CustomToolSpec): void {
    // Untrusted embedded specs: validate and never shadow an already-registered tool.
    if (!isValidCustomToolSpec(spec)) return;
    if (this.registry.get(spec.name)) return;
    this.registry.upsert(this.buildManifest(spec));
  }

  async delete(id: string): Promise<void> {
    const existing = this._specs().find((s) => s.id === id);
    if (!existing) return;
    const db = await this.db();
    await idbDelete(db, STORE, id);
    this._specs.update((list) => list.filter((s) => s.id !== id));
    this.registry.unregister(existing.name);
  }

  getById(id: string): CustomToolSpec | undefined {
    return this._specs().find((s) => s.id === id);
  }

  isNameInUse(name: string, exceptId?: string): boolean {
    if (!name) return false;
    const ownedNames = new Set(this._specs().map((s) => s.name));
    if (this._specs().some((s) => s.name === name && s.id !== exceptId)) return true;
    return this.registry.list().some((t) => t.name === name && !ownedNames.has(t.name));
  }

  private buildManifest(spec: CustomToolSpec): ToolManifest {
    return {
      name: spec.name,
      description: spec.description,
      declaration: specToDeclaration(spec),
      load: async () => {
        const [{ specToDescriptor }, { CustomToolCardComponent }] = await Promise.all([
          import('./custom-tool-descriptor'),
          import('../../shared/tools/custom-tool-card/custom-tool-card'),
        ]);
        return specToDescriptor(spec, CustomToolCardComponent);
      },
    };
  }

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDb(DB_NAME, DB_VERSION, (db) => {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      }).catch((err) => {
        this._unavailable.set(true);
        const appError = normalizeStorageError(err, { feature: 'custom-tools', op: 'open' });
        this.logger.warn(appError.technicalMessage, {
          category: appError.category,
          context: { feature: 'custom-tools', op: 'open' },
          error: appError.cause ?? err,
        });
        throw err;
      });
    }
    return this.dbPromise;
  }
}

function byCreatedDesc(a: CustomToolSpec, b: CustomToolSpec): number {
  return b.createdAt - a.createdAt;
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `tool_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
