import { useState, useRef } from 'react';

const API_BASE = 'http://localhost:3000/api/audio';

interface ClassificationResult {
  label: string;
  score: number;
}

interface FlagHit {
  word: string;
  count: number;
}

interface TranscriptionFlags {
  urgency: FlagHit[];
  emotions: FlagHit[];
}

interface AnalysisState {
  classification: ClassificationResult[] | null;
  transcription: string | null;
  flags: TranscriptionFlags | null;
  speechEmotion: { 
    label: string; 
    score: number; 
    acoustic: string | null; 
    textSentiment: string | null;
  } | null;
  gcsUrls: { recording: string | null };
  classLoading: boolean;
  transLoading: boolean;
  error: string | null;
}

const initialState: AnalysisState = {
  classification: null,
  transcription: null,
  flags: null,
  speechEmotion: null,
  gcsUrls: { recording: null },
  classLoading: false,
  transLoading: false,
  error: null,
};

// ---------------------------------------------------------------------------
// Flag category display config
// ---------------------------------------------------------------------------
const FLAG_CATEGORIES: { key: keyof TranscriptionFlags; label: string; icon: string; color: string; badge: string }[] = [
  {
    key: 'urgency',
    label: 'Urgency Keywords',
    icon: '🚨',
    color: 'border-red-200 bg-red-50',
    badge: 'bg-red-100 text-red-700',
  },
  {
    key: 'emotions',
    label: 'Emotion Keywords',
    icon: '💛',
    color: 'border-yellow-200 bg-yellow-50',
    badge: 'bg-yellow-100 text-yellow-700',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AudioAnalysis() {
  const [state, setState] = useState<AnalysisState>(initialState);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  async function processAndAnalyze(arrayBuffer: ArrayBuffer) {
    setState({ classification: null, transcription: null, flags: null, speechEmotion: null, gcsUrls: { recording: null }, classLoading: true, transLoading: true, error: null });

    try {
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const float32Data = audioBuffer.getChannelData(0);
      const audioArray = Array.from(float32Data);

      // Fire both requests simultaneously
      const classPromise = fetch(`${API_BASE}/classification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: audioArray }),
      });
      const transPromise = fetch(`${API_BASE}/transcription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: audioArray }),
      });

      // Classification resolves faster
      const classRes = await classPromise;
      if (!classRes.ok) throw new Error(`Classification error: ${await classRes.text()}`);
      const classJson: { results: ClassificationResult[] } = await classRes.json();
      setState(prev => ({
        ...prev,
        classification: classJson.results,
        classLoading: false,
      }));

      // Transcription + flags resolves slower
      const transRes = await transPromise;
      if (!transRes.ok) throw new Error(`Transcription error: ${await transRes.text()}`);
      const transData: { 
        text: string; 
        flags: TranscriptionFlags; 
        gcsUrl: string | null; 
        speechEmotion: { label: string; score: number; acoustic: string | null; textSentiment: string | null } | null 
      } = await transRes.json();
      setState(prev => ({
        ...prev,
        transcription: transData.text || '(No speech detected)',
        flags: transData.flags,
        speechEmotion: transData.speechEmotion,
        gcsUrls: { recording: transData.gcsUrl },
        transLoading: false,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState(prev => ({ ...prev, error: message, classLoading: false, transLoading: false }));
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await processAndAnalyze(await file.arrayBuffer());
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        await processAndAnalyze(await blob.arrayBuffer());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setState(prev => ({ ...prev, error: 'Microphone access denied or unavailable.' }));
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  const isAnalyzing = state.classLoading || state.transLoading;
  const hasAnyFlags = state.flags && FLAG_CATEGORIES.some(c => state.flags![c.key].length > 0);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
          🎧 Audio Analysis
        </h2>
        <p className="text-gray-500 mt-2 text-sm">Upload a file or record live for AI-powered classification, transcription &amp; keyword detection</p>
      </div>

      {/* Input Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* File Upload */}
        <label className="group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 cursor-pointer p-8 transition-colors">
          <span className="text-4xl">📁</span>
          <span className="font-semibold text-blue-700">Upload Audio File</span>
          <span className="text-xs text-gray-400">MP3, WAV, OGG, WebM…</span>
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isAnalyzing || isRecording}
          />
        </label>

        {/* Microphone */}
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50 p-8">
          <span className="text-4xl">{isRecording ? '🔴' : '🎤'}</span>
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={isAnalyzing}
              className="rounded-xl bg-purple-600 px-6 py-2 font-semibold text-white shadow hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="rounded-xl bg-red-500 px-6 py-2 font-semibold text-white shadow hover:bg-red-600 transition-colors animate-pulse"
            >
              Stop &amp; Analyze
            </button>
          )}
          {isRecording && <span className="text-xs text-red-500 font-medium">Recording in progress…</span>}
        </div>
      </div>

      {/* Error */}
      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
          ⚠️ {state.error}
        </div>
      )}

      {/* ── Classification ── */}
      {(state.classLoading || state.classification) && (
        <div className="rounded-2xl bg-white shadow-md border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="font-bold text-gray-800 text-lg">🔊 Sound Classification</h3>
          </div>
          <div className="px-6 py-4">
            {state.classLoading ? (
              <Spinner color="text-blue-500" label="Classifying audio…" />
            ) : (
              <ul className="space-y-2">
                {state.classification?.map((r) => (
                  <li key={r.label} className="flex items-center gap-3">
                    <span className="w-44 truncate text-sm font-medium text-gray-700">{r.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2.5 rounded-full transition-all duration-700"
                        style={{ width: `${(r.score * 100).toFixed(1)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">{(r.score * 100).toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      {(state.transLoading || state.transcription !== null) && (
        <div className="rounded-2xl bg-white shadow-md border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="font-bold text-gray-800 text-lg">📝 Transcription</h3>
          </div>
          <div className="px-6 py-4">
            {state.transLoading ? (
              <Spinner color="text-purple-500" label="Transcribing speech — this may take a few seconds…" />
            ) : (
              <p className="text-gray-700 leading-relaxed bg-gray-50 rounded-xl px-4 py-3 text-sm italic">
                "{state.transcription}"
              </p>
            )}
            {state.speechEmotion && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tone Consensus:</span>
                  <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ring-1 ring-inset capitalize ${
                    state.speechEmotion.label === 'Angry' ? 'bg-red-50 text-red-700 ring-red-700/20' :
                    state.speechEmotion.label === 'Fearful' ? 'bg-orange-50 text-orange-700 ring-orange-700/20' :
                    state.speechEmotion.label === 'Sad' ? 'bg-blue-50 text-blue-700 ring-blue-700/20' :
                    state.speechEmotion.label === 'Normal/Calm' ? 'bg-green-50 text-green-700 ring-green-700/20' :
                    'bg-gray-50 text-gray-700 ring-gray-700/20'
                  }`}>
                    {state.speechEmotion.label}
                  </span>
                </div>
                
                {(state.speechEmotion.acoustic || state.speechEmotion.textSentiment) && (
                  <div className="flex flex-wrap gap-4 text-[10px] text-gray-400 border-t pt-2 mt-2">
                    {state.speechEmotion.acoustic && (
                      <div className="flex flex-col">
                        <span className="uppercase font-medium opacity-70">Acoustic Tone</span>
                        <span className="text-gray-600 font-semibold">{state.speechEmotion.acoustic} ({(state.speechEmotion.score * 100).toFixed(0)}%)</span>
                      </div>
                    )}
                    {state.speechEmotion.textSentiment && (
                      <div className="flex flex-col">
                        <span className="uppercase font-medium opacity-70">Text Sentiment</span>
                        <span className="text-gray-600 font-semibold">{state.speechEmotion.textSentiment}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {!state.transLoading && state.transcription !== null && (
            <div className={`border-t px-6 py-2 flex items-start gap-2 text-xs ${
              state.gcsUrls.recording
                ? 'border-gray-100 bg-gray-50 text-gray-500'
                : 'border-orange-100 bg-orange-50 text-orange-600'
            }`}>
              <span className="shrink-0">{state.gcsUrls.recording ? '☁️ GCS saved:' : '⚠️ GCS not saved:'}</span>
              <code className={state.gcsUrls.recording ? 'text-blue-600 break-all' : 'text-orange-500'}>
                {state.gcsUrls.recording ?? 'Upload failed or GCS not configured'}
              </code>
            </div>
          )}
        </div>
      )}
      {state.flags && (
        <>
          {hasAnyFlags ? (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 text-base flex items-center gap-2">
                🏷️ Detected Keywords
              </h3>
              {FLAG_CATEGORIES.map(({ key, label, icon, color, badge }) => {
                const hits = state.flags![key];
                if (hits.length === 0) return null;
                return (
                  <div key={key} className={`rounded-2xl border ${color} overflow-hidden`}>
                    <div className="px-6 py-3 border-b border-inherit flex items-center gap-2">
                      <span>{icon}</span>
                      <span className="font-semibold text-gray-800 text-sm">{label}</span>
                      <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>
                        {hits.length} {hits.length === 1 ? 'keyword' : 'keywords'} found
                      </span>
                    </div>
                    <div className="px-6 py-4 flex flex-wrap gap-2">
                      {hits.map(({ word, count }) => (
                        <span
                          key={word}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${badge}`}
                        >
                          <span>"{word}"</span>
                          <span className="text-xs opacity-70 font-normal">
                            ×{count}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-6 py-4 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-green-800 text-sm">No flagged keywords detected</p>
                <p className="text-green-700 text-xs mt-0.5">No urgency or emotional distress indicators found in this transcript.</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Raw JSON ── */}
      {state.classification && state.transcription !== null && !state.transLoading && (
        <details open className="rounded-2xl border border-gray-200 overflow-hidden text-sm">
          <summary className="cursor-pointer bg-gray-50 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100">
            Raw JSON Response
          </summary>
          <pre className="overflow-x-auto bg-gray-900 text-green-400 px-6 py-4 text-xs leading-relaxed">
            {JSON.stringify({ classification: state.classification, transcription: state.transcription, flags: state.flags, speechEmotion: state.speechEmotion, gcsUrls: state.gcsUrls }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spinner helper
// ---------------------------------------------------------------------------
function Spinner({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-3 text-gray-500 text-sm">
      <svg className={`animate-spin h-5 w-5 ${color}`} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      {label}
    </div>
  );
}
