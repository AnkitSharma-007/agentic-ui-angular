// Web Speech API wrapper — browser handles STT; no audio or model tokens through this app.

export interface SpeechSessionHandlers {
  /** Cumulative transcript for the session (finalized text + latest interim). */
  readonly onTranscript: (text: string) => void;
  readonly onError?: (error: string) => void;
  readonly onEnd?: () => void;
}

export interface SpeechController {
  stop(): void;
  abort(): void;
}

export interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: ArrayLike<{
    readonly isFinal: boolean;
    readonly length: number;
    readonly [index: number]: { readonly transcript: string };
  }>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { readonly error: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null;
}

// Pure transcript reducer — keeps the (jsdom-untestable) recognition object thin.
export function readTranscript(
  event: SpeechRecognitionEventLike,
  previousFinal: string,
): { readonly finalText: string; readonly combined: string } {
  let finalText = previousFinal;
  let interim = '';
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result = event.results[i];
    const transcript = result?.[0]?.transcript ?? '';
    if (result?.isFinal) finalText += transcript;
    else interim += transcript;
  }
  return { finalText, combined: `${finalText}${interim}`.trim() };
}

export function describeSpeechError(error: string): string {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone permission was denied.';
    case 'no-speech':
      return 'No speech detected — try again.';
    case 'audio-capture':
      return 'No microphone was found.';
    case 'network':
      return 'Voice input needs a network connection.';
    default:
      return 'Voice input stopped unexpectedly.';
  }
}

export function startSpeechRecognition(
  handlers: SpeechSessionHandlers,
  opts: { readonly lang?: string } = {},
): SpeechController | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  const fallbackLang =
    typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
  recognition.lang = opts.lang ?? fallbackLang;
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalText = '';
  recognition.onresult = (event) => {
    const { finalText: nextFinal, combined } = readTranscript(event, finalText);
    finalText = nextFinal;
    handlers.onTranscript(combined);
  };
  recognition.onerror = (event) => handlers.onError?.(event.error);
  recognition.onend = () => handlers.onEnd?.();

  recognition.start();
  return {
    stop: () => recognition.stop(),
    abort: () => recognition.abort(),
  };
}
