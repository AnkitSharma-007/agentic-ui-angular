import { describe, expect, it } from 'vitest';
import {
  kindFromMime,
  normalizeUserTurnInput,
  toDataUrl,
  toInlineDataPart,
  type InlineAttachment,
} from './attachment.types';

const sample: InlineAttachment = {
  id: 'a1',
  kind: 'image',
  mimeType: 'image/jpeg',
  dataBase64: 'QUJD',
  sizeBytes: 3,
};

describe('normalizeUserTurnInput', () => {
  it('wraps a bare string as a text-only turn', () => {
    expect(normalizeUserTurnInput('hello')).toEqual({ text: 'hello' });
  });

  it('passes an object input through unchanged', () => {
    const input = { text: 'hi', attachments: [sample] };
    expect(normalizeUserTurnInput(input)).toBe(input);
  });
});

describe('toInlineDataPart', () => {
  it('maps an attachment to a Gemini inlineData part', () => {
    expect(toInlineDataPart(sample)).toEqual({
      inlineData: { mimeType: 'image/jpeg', data: 'QUJD' },
    });
  });
});

describe('toDataUrl', () => {
  it('builds a display-ready data URL', () => {
    expect(toDataUrl(sample)).toBe('data:image/jpeg;base64,QUJD');
  });
});

describe('kindFromMime', () => {
  it('classifies audio and images', () => {
    expect(kindFromMime('audio/webm')).toBe('audio');
    expect(kindFromMime('image/png')).toBe('image');
    expect(kindFromMime('application/octet-stream')).toBe('image');
  });
});
