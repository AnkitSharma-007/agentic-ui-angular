import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { CustomToolsService } from '../../core/custom-tools/custom-tools.service';
import type {
  CustomToolParameter,
  CustomToolParameterType,
  CustomToolSpec,
} from '../../core/custom-tools/custom-tool.types';
import {
  addDraftParam,
  applyToolDraftValidators,
  buildTemplatePreview,
  removeDraftParam,
  setDraftParamRequired,
  setDraftParamType,
  TYPE_OPTIONS,
  type DraftParameter,
  type ToolDraftModel,
} from '../../core/custom-tools/tool-draft-form';
import { PageHeaderComponent } from '../../shared/page-header/page-header';
import { coalesceWithRaf } from '../../shared/util/raf-coalesce';
import { randomUuid } from '../../core/utils/id';

const DEFAULT_TEMPLATE = '{\n  "result": "ok"\n}';

function emptyBuilder(): ToolDraftModel {
  return { name: '', description: '', parameters: [], responseTemplate: DEFAULT_TEMPLATE };
}

@Component({
  selector: 'app-tools',
  imports: [
    FormField,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    PageHeaderComponent,
  ],
  templateUrl: './tools.html',
  styleUrl: './tools.scss',
})
export class ToolsComponent {
  protected readonly customTools = inject(CustomToolsService);

  protected readonly specs = this.customTools.specs;
  protected readonly editingId = signal<string | null>(null);

  // Editor validation (name format/uniqueness, description, parameters) lives in the shared schema.
  protected readonly builderModel = signal<ToolDraftModel>(emptyBuilder());

  protected readonly builderForm = form(this.builderModel, (p) =>
    applyToolDraftValidators(p, {
      isNameInUse: (n) => this.customTools.isNameInUse(n, this.editingId() ?? undefined),
      nameInUseMessage: 'A tool with this name already exists.',
      descriptionMessage: 'A description is required.',
    }),
  );

  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly justSaved = signal<string | null>(null);
  // Id awaiting two-step inline delete confirm instead of native confirm().
  protected readonly confirmingDeleteId = signal<string | null>(null);

  protected readonly typeOptions = TYPE_OPTIONS;

  protected readonly nameError = computed<string | null>(
    () => this.builderForm.name().errors()[0]?.message ?? null,
  );

  // rAF-coalesced mirrors so keystrokes don't re-run applyResponseTemplate + JSON.stringify each char.
  private readonly debouncedModel = coalesceWithRaf(
    () => {
      const m = this.builderModel();
      return {
        responseTemplate: m.responseTemplate,
        parameters: m.parameters as readonly DraftParameter[],
      };
    },
    { responseTemplate: DEFAULT_TEMPLATE, parameters: [] as readonly DraftParameter[] },
  );
  private readonly debouncedParameters = computed(() => this.debouncedModel().parameters);
  private readonly debouncedTemplate = computed(() => this.debouncedModel().responseTemplate);

  protected readonly templatePreview = computed(() => {
    const args: Record<string, unknown> = {};
    for (const p of this.debouncedParameters()) {
      if (!p.name) continue;
      args[p.name] = sampleValue(p.type);
    }
    return buildTemplatePreview(this.debouncedTemplate(), args);
  });

  protected readonly canSave = computed(
    () => this.builderForm().valid() && this.templatePreview().ok,
  );

  protected startNew(): void {
    this.editingId.set(null);
    this.builderModel.set(emptyBuilder());
    this.saveError.set(null);
    this.justSaved.set(null);
  }

  protected edit(spec: CustomToolSpec): void {
    this.editingId.set(spec.id);
    this.builderModel.set({
      name: spec.name,
      description: spec.description,
      parameters: spec.parameters.map((p) => ({
        name: p.name,
        type: p.type,
        description: p.description,
        required: p.required,
      })),
      responseTemplate: spec.responseTemplate,
    });
    this.saveError.set(null);
    this.justSaved.set(null);
  }

  protected addParameter(): void {
    this.builderModel.update(addDraftParam);
  }

  protected removeParameter(index: number): void {
    this.builderModel.update((m) => removeDraftParam(m, index));
  }

  protected updateParameterType(index: number, value: CustomToolParameterType): void {
    this.builderModel.update((m) => setDraftParamType(m, index, value));
  }

  protected updateParameterRequired(index: number, value: boolean): void {
    this.builderModel.update((m) => setDraftParamRequired(m, index, value));
  }

  protected async save(): Promise<void> {
    if (!this.canSave() || this.saving()) return;
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const model = this.builderModel();
      const id = this.editingId() ?? randomUuid();
      const now = Date.now();
      const spec: CustomToolSpec = {
        id,
        name: model.name.trim(),
        description: model.description.trim(),
        parameters: model.parameters.map((p) => ({
          name: p.name.trim(),
          type: p.type,
          description: p.description.trim(),
          required: p.required,
        })) as readonly CustomToolParameter[],
        responseTemplate: model.responseTemplate,
        // Preserve agent-authored provenance on edit; new tools are user-authored.
        origin: this.editingId() ? this.customTools.getById(id)?.origin ?? 'user' : 'user',
        createdAt: this.editingId()
          ? this.customTools.getById(id)?.createdAt ?? now
          : now,
        updatedAt: now,
      };
      await this.customTools.save(spec);
      this.editingId.set(id);
      this.justSaved.set(spec.name);
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async delete(spec: CustomToolSpec): Promise<void> {
    // Two-step delete: first click arms, second commits.
    if (this.confirmingDeleteId() !== spec.id) {
      this.confirmingDeleteId.set(spec.id);
      return;
    }
    this.confirmingDeleteId.set(null);
    try {
      await this.customTools.delete(spec.id);
      if (this.editingId() === spec.id) this.startNew();
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  protected cancelDelete(): void {
    this.confirmingDeleteId.set(null);
  }

  protected loadExample(): void {
    this.editingId.set(null);
    this.builderModel.set({
      name: 'searchWeather',
      description: 'Get a weather forecast for a city on a specific date.',
      parameters: [
        { name: 'city', type: 'string', description: 'City name, e.g. "Goa".', required: true },
        { name: 'date', type: 'string', description: 'Date in YYYY-MM-DD format.', required: true },
      ],
      responseTemplate: `{
  "city": {{city}},
  "date": {{date}},
  "forecast": "Partly cloudy, 28°C with light breezes",
  "uvIndex": 6,
  "rainChance": 0.15
}`,
    });
    this.saveError.set(null);
    this.justSaved.set(null);
  }
}

function sampleValue(type: CustomToolParameterType): unknown {
  switch (type) {
    case 'string':
      return 'example';
    case 'number':
      return 42;
    case 'boolean':
      return true;
  }
}
