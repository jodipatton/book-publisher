// Speech-to-text pipeline.
//
// Production wires this to either OpenAI Whisper or Deepgram depending on
// which provides better latency for the user's region. The interface
// stays single-call so the rest of the app doesn't care which vendor
// answered. This scaffold ships a deterministic stub so the
// voice-refine-regenerate loop is testable offline.

export type STTProvider = 'whisper' | 'deepgram' | 'stub';

export interface TranscriptionResult {
  text: string;
  // Confidence 0..1. Stub always returns 1 for stub-sourced text.
  confidence: number;
  // Vendor that answered, for telemetry.
  provider: STTProvider;
  // Round-trip latency in milliseconds.
  latencyMs: number;
}

export interface STTOptions {
  provider?: STTProvider;
  // OpenAI Whisper API key. Falls back to env var.
  whisperApiKey?: string;
  // Deepgram API key. Falls back to env var.
  deepgramApiKey?: string;
}

// Read the configured provider from env. Default order: whisper > deepgram > stub.
function resolveProvider(opts: STTOptions = {}): STTProvider {
  if (opts.provider) return opts.provider;
  const env = process.env.STT_PROVIDER as STTProvider | undefined;
  if (env === 'whisper' || env === 'deepgram' || env === 'stub') return env;
  if (process.env.WHISPER_API_KEY ?? opts.whisperApiKey) return 'whisper';
  if (process.env.DEEPGRAM_API_KEY ?? opts.deepgramApiKey) return 'deepgram';
  return 'stub';
}

// Transcribe an audio blob. The audio parameter is a Blob in the browser
// and a Buffer-like object in server-side calls. The stub provider
// ignores it and returns the supplied fallback text — that's the path
// the demo UI uses when there's no API key configured.
export async function transcribeAudio(
  audio: Blob | ArrayBuffer | null,
  fallbackText = '',
  opts: STTOptions = {},
): Promise<TranscriptionResult> {
  const provider = resolveProvider(opts);
  const start = Date.now();

  if (provider === 'whisper') {
    return runWhisper(audio, opts.whisperApiKey, start);
  }
  if (provider === 'deepgram') {
    return runDeepgram(audio, opts.deepgramApiKey, start);
  }
  return {
    text: fallbackText,
    confidence: 1,
    provider: 'stub',
    latencyMs: Date.now() - start,
  };
}

async function runWhisper(
  audio: Blob | ArrayBuffer | null,
  apiKey: string | undefined,
  start: number,
): Promise<TranscriptionResult> {
  // Production calls https://api.openai.com/v1/audio/transcriptions with
  // model=whisper-1. We don't reach the network from the scaffold; if no
  // key is set we degrade to an empty transcription and surface that to
  // the caller so the UI can prompt for input rather than silently fail.
  if (!apiKey && !process.env.WHISPER_API_KEY) {
    return {
      text: '',
      confidence: 0,
      provider: 'whisper',
      latencyMs: Date.now() - start,
    };
  }
  // Placeholder for the real network call.
  void audio;
  return {
    text: '',
    confidence: 0,
    provider: 'whisper',
    latencyMs: Date.now() - start,
  };
}

async function runDeepgram(
  audio: Blob | ArrayBuffer | null,
  apiKey: string | undefined,
  start: number,
): Promise<TranscriptionResult> {
  // Production calls Deepgram's prerecorded or live endpoint depending on
  // streaming mode. Same fallback semantics as Whisper.
  if (!apiKey && !process.env.DEEPGRAM_API_KEY) {
    return {
      text: '',
      confidence: 0,
      provider: 'deepgram',
      latencyMs: Date.now() - start,
    };
  }
  void audio;
  return {
    text: '',
    confidence: 0,
    provider: 'deepgram',
    latencyMs: Date.now() - start,
  };
}

// The browser-side Web Speech API isn't a substitute for whisper / deepgram —
// quality varies by platform — but it's good enough for the demo loop and
// avoids a server hop entirely.
export interface BrowserSpeechRecognition {
  start(): void;
  stop(): void;
  onResult(handler: (text: string) => void): void;
  onError(handler: (err: string) => void): void;
  supported: boolean;
}

type AnyWindow = typeof window & {
  webkitSpeechRecognition?: new () => SpeechRecognitionShim;
  SpeechRecognition?: new () => SpeechRecognitionShim;
};

interface SpeechRecognitionShim {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}

export function createBrowserRecognition(): BrowserSpeechRecognition {
  if (typeof window === 'undefined') {
    return inertRecognition();
  }
  const win = window as AnyWindow;
  const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
  if (!Ctor) return inertRecognition();

  const rec = new Ctor();
  rec.continuous = false;
  rec.interimResults = false;
  rec.lang = 'en-US';
  let onResult: (text: string) => void = () => {};
  let onError: (err: string) => void = () => {};

  rec.onresult = (event) => {
    const last = event.results[event.results.length - 1];
    const transcript = last?.[0]?.transcript ?? '';
    if (transcript) onResult(transcript);
  };
  rec.onerror = (event) => onError(event.error);

  return {
    supported: true,
    start: () => rec.start(),
    stop: () => rec.stop(),
    onResult: (handler) => { onResult = handler; },
    onError: (handler) => { onError = handler; },
  };
}

function inertRecognition(): BrowserSpeechRecognition {
  return {
    supported: false,
    start: () => {},
    stop: () => {},
    onResult: () => {},
    onError: () => {},
  };
}
