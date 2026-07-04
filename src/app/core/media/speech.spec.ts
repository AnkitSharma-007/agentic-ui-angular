import { describe, expect, it } from 'vitest';
import {
  describeSpeechError,
  isSpeechRecognitionSupported,
  readTranscript,
  startSpeechRecognition,
  type SpeechRecognitionEventLike,
} from './speech';

function makeEvent(
  segments: readonly { readonly transcript: string; readonly isFinal: boolean }[],
  resultIndex = 0,
): SpeechRecognitionEventLike {
  const results = segments.map((s) => ({
    isFinal: s.isFinal,
    length: 1,
    0: { transcript: s.transcript },
  }));
  return { resultIndex, results } as unknown as SpeechRecognitionEventLike;
}

describe('readTranscript', () => {
  it('appends finalized segments to the previous final text', () => {
    const { finalText, combined } = readTranscript(
      makeEvent([{ transcript: 'hello world', isFinal: true }]),
      '',
    );
    expect(finalText).toBe('hello world');
    expect(combined).toBe('hello world');
  });

  it('keeps interim results out of the final text but shows them in combined', () => {
    const { finalText, combined } = readTranscript(
      makeEvent([
        { transcript: 'plan a trip ', isFinal: true },
        { transcript: 'to Goa', isFinal: false },
      ]),
      '',
    );
    expect(finalText).toBe('plan a trip ');
    expect(combined).toBe('plan a trip to Goa');
  });

  it('accumulates across calls by threading previousFinal', () => {
    const first = readTranscript(makeEvent([{ transcript: 'one ', isFinal: true }]), '');
    const second = readTranscript(
      makeEvent([{ transcript: 'two', isFinal: true }]),
      first.finalText,
    );
    expect(second.combined).toBe('one two');
  });
});

describe('describeSpeechError', () => {
  it('maps known errors to friendly copy', () => {
    expect(describeSpeechError('not-allowed')).toMatch(/permission/i);
    expect(describeSpeechError('no-speech')).toMatch(/no speech/i);
    expect(describeSpeechError('audio-capture')).toMatch(/microphone/i);
  });

  it('falls back for unknown errors', () => {
    expect(describeSpeechError('weird-thing')).toMatch(/unexpectedly/i);
  });
});

describe('capability detection', () => {
  it('reports unsupported and returns null controller when the API is absent (jsdom)', () => {
    expect(isSpeechRecognitionSupported()).toBe(false);
    const controller = startSpeechRecognition({ onTranscript: () => {} });
    expect(controller).toBeNull();
  });
});
