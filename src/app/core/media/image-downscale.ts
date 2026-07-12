// Downscale images before inlining into Gemini requests and replay storage.

import type { InlineAttachment } from './attachment.types';

export const MAX_ATTACHMENTS = 4;
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
export const DEFAULT_MAX_EDGE = 1568; // Gemini's high-detail image tile ceiling
export const DEFAULT_QUALITY = 0.82;

export interface ScaledDimensions {
  readonly width: number;
  readonly height: number;
}

// Scale longest edge to `maxEdge`; never upscale; guard zero-sized inputs.
export function computeScaledDimensions(
  width: number,
  height: number,
  maxEdge: number,
): ScaledDimensions {
  const longest = Math.max(width, height);
  if (longest <= maxEdge || longest === 0) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export async function downscaleImageToAttachment(
  file: File,
  opts: { readonly maxEdge?: number; readonly quality?: number } = {},
): Promise<InlineAttachment> {
  const maxEdge = opts.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = opts.quality ?? DEFAULT_QUALITY;
  const outMime = 'image/jpeg';

  const img = await loadImageElement(file);
  const { width, height } = computeScaledDimensions(
    img.naturalWidth,
    img.naturalHeight,
    maxEdge,
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is unavailable.');
  ctx.drawImage(img, 0, 0, width, height);

  const dataBase64 = stripBase64Prefix(canvas.toDataURL(outMime, quality));
  return {
    id: newAttachmentId(),
    kind: 'image',
    mimeType: outMime,
    dataBase64,
    name: file.name,
    sizeBytes: approxBytesFromBase64(dataBase64),
  };
}

function loadImageElement(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image.'));
    };
    img.src = url;
  });
}

function stripBase64Prefix(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

export function approxBytesFromBase64(b64: string): number {
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

function newAttachmentId(): string {
  return `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
