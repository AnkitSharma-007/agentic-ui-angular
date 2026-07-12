// Base64 media inlined into Gemini as `inlineData` — nothing uploaded elsewhere.

export type AttachmentKind = 'image' | 'audio';

export interface InlineAttachment {
  readonly id: string;
  readonly kind: AttachmentKind;
  readonly mimeType: string;
  readonly dataBase64: string; // raw base64, no `data:` prefix
  readonly name?: string;
  readonly sizeBytes: number;
}

export interface UserTurnInput {
  readonly text: string;
  readonly attachments?: readonly InlineAttachment[];
}

// Echo view of a stored user turn; `dataUrl` is display-ready.
export interface UserTurnAttachmentView {
  readonly kind: AttachmentKind;
  readonly mimeType: string;
  readonly dataUrl: string;
}

export interface UserTurnView {
  readonly text: string;
  readonly attachments: readonly UserTurnAttachmentView[];
}

export const EMPTY_USER_TURN_VIEW: UserTurnView = { text: '', attachments: [] };

// Normalize bare string or full object at the boundary.
export function normalizeUserTurnInput(input: string | UserTurnInput): UserTurnInput {
  return typeof input === 'string' ? { text: input } : input;
}

export function toInlineDataPart(a: InlineAttachment): {
  readonly inlineData: { readonly mimeType: string; readonly data: string };
} {
  return { inlineData: { mimeType: a.mimeType, data: a.dataBase64 } };
}

export function toDataUrl(a: InlineAttachment): string {
  return `data:${a.mimeType};base64,${a.dataBase64}`;
}

export function kindFromMime(mimeType: string): AttachmentKind {
  return mimeType.startsWith('audio/') ? 'audio' : 'image';
}

// Allowlist for replay display — untrusted stored MIMEs must not become exploitable `data:` URLs.
const DISPLAYABLE_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const DISPLAYABLE_AUDIO_MIME = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
]);

export function isDisplayableAttachmentMime(mimeType: string): boolean {
  const mime = mimeType.trim().toLowerCase();
  return DISPLAYABLE_IMAGE_MIME.has(mime) || DISPLAYABLE_AUDIO_MIME.has(mime);
}
