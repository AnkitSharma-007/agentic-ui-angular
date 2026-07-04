// Multimodal user-turn input. An `InlineAttachment` is base64 media that gets
// inlined into the Gemini request as an `inlineData` part — nothing is uploaded
// anywhere, keeping the app's "nothing leaves the browser but Gemini" posture.

export type AttachmentKind = 'image' | 'audio';

export interface InlineAttachment {
  readonly id: string;
  readonly kind: AttachmentKind;
  readonly mimeType: string; // e.g. 'image/jpeg', 'audio/webm'
  readonly dataBase64: string; // raw base64, no `data:` prefix
  readonly name?: string;
  readonly sizeBytes: number;
}

// A user turn is text, optional attachments, or both.
export interface UserTurnInput {
  readonly text: string;
  readonly attachments?: readonly InlineAttachment[];
}

// UI-facing view of a stored user turn (derived from raw history), used to echo
// what the user sent above the response. `dataUrl` is display-ready.
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

// Callers may pass a bare string (text-only, the common case) or the full
// object; normalize once at the boundary so downstream code sees one shape.
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
