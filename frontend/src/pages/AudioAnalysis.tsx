import { useState, useRef } from 'react';

const API_BASE = 'http://localhost:3000/api/audio';

interface ClassificationResult {
  label: string;
  score: number;
}

interface AnalysisState {
  classification: ClassificationResult[] | null;
  transcription: string | null;
  classLoading: boolean;
  transLoading: boolean;
  error: string | null;
}

const initialState: AnalysisState = {
  classification: null,
  transcription: null,
  classLoading: false,
  transLoading: false,
  error: null,
};

export function AudioAnalysis() {
  const [state, setState] = useState<AnalysisState>(initialState);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  async function processAndAnalyze(arrayBuffer: ArrayBuffer) {
    setState({ classification: null, transcription: null, classLoading: true, transLoading: true, error: null });

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

      // Resolve classification first (faster)
      const classRes = await classPromise;
      if (!classRes.ok) throw new Error(`Classification error: ${await classRes.text()}`);
      const classData: ClassificationResult[] = await classRes.json();
      setState(prev => ({ ...prev, classification: classData, classLoading: false }));

      // Resolve transcription second (slower)
      const transRes = await transPromise;
      if (!transRes.ok) throw new Error(`Transcription error: ${await transRes.text()}`);
      const transData = await transRes.json();
      setState(prev => ({ ...prev, transcription: transData.text || '(No speech detected)', transLoading: false }));
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

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
          🎧 Audio Analysis
        </h2>
        <p className="text-gray-500 mt-2 text-sm">Upload a file or record live for AI-powered classification &amp; transcription</p>
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

      {/* Results */}
      {(state.classLoading || state.classification) && (
        <div className="rounded-2xl bg-white shadow-md border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="font-bold text-gray-800 text-lg">🔊 Sound Classification</h3>
          </div>
          <div className="px-6 py-4">
            {state.classLoading ? (
              <div className="flex items-center gap-3 text-gray-500 text-sm">
                <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Classifying audio…
              </div>
            ) : (
              <ul className="space-y-2">
                {state.classification?.slice(0, 5).map((r) => (
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
              <div className="flex items-center gap-3 text-gray-500 text-sm">
                <svg className="animate-spin h-5 w-5 text-purple-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Transcribing speech — this may take a few seconds…
              </div>
            ) : (
              <p className="text-gray-700 leading-relaxed bg-gray-50 rounded-xl px-4 py-3 text-sm italic">
                "{state.transcription}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* Raw JSON debug view (collapsed by default) */}
      {state.classification && state.transcription !== null && !state.transLoading && (
        <details className="rounded-2xl border border-gray-200 overflow-hidden text-sm">
          <summary className="cursor-pointer bg-gray-50 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100">
            Raw JSON Response
          </summary>
          <pre className="overflow-x-auto bg-gray-900 text-green-400 px-6 py-4 text-xs leading-relaxed">
            {JSON.stringify({ classification: state.classification, transcription: state.transcription }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
