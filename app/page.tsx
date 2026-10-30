'use client';

import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "https://lima-api-yypp.onrender.com").replace(/\/$/, "");
const REPO_URL = "https://github.com/valentinakiyungi/Lima";

// Safari records mp4, Chrome/Firefox record webm/ogg, so pick what the browser supports.
const AUDIO_TYPES: { mime: string; ext: string }[] = [
  { mime: "audio/webm;codecs=opus", ext: "webm" },
  { mime: "audio/webm", ext: "webm" },
  { mime: "audio/mp4", ext: "mp4" },
  { mime: "audio/ogg;codecs=opus", ext: "ogg" },
];

const iconButton =
  "p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors";

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    transcript?: string;
    summary?: string;
    action_items?: string[];
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // The free Render backend sleeps when idle; ping it on load so it is awake when the user records.
  useEffect(() => {
    fetch(`${API_BASE_URL}/health`).catch(() => {});
  }, []);

  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const picked =
        typeof MediaRecorder !== 'undefined'
          ? AUDIO_TYPES.find((t) => MediaRecorder.isTypeSupported(t.mime))
          : undefined;
      const mediaRecorder = picked
        ? new MediaRecorder(stream, { mimeType: picked.mime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const type = mediaRecorder.mimeType || picked?.mime || 'audio/webm';
        const ext = AUDIO_TYPES.find((t) => type.startsWith(t.mime.split(';')[0]))?.ext || 'webm';
        const audioBlob = new Blob(audioChunksRef.current, { type });
        if (audioBlob.size === 0) {
          setError("No audio was captured. Please try again.");
          return;
        }
        await sendAudioToBackend(audioBlob, ext);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      setError("Microphone access was denied or is not supported in this browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
  };

  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const sendAudioToBackend = async (audioBlob: Blob, ext: string) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", audioBlob, `voice_note.${ext}`);
    formData.append("user_id", "val_123");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(`${API_BASE_URL}/chat/voice`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server returned status ${response.status}`);
      }

      const data = await response.json();
      setResult({
        transcript: data.transcript,
        summary: data.summary,
        action_items: data.action_items,
      });
    } catch (err) {
      console.error("Backend error:", err);
      const aborted = err instanceof DOMException && err.name === 'AbortError';
      setError(
        aborted
          ? "The server took too long to respond. It may be waking up, so please try again."
          : `Could not process the voice note: ${err instanceof Error ? err.message : 'unknown error'}`
      );
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-dvh transition-colors duration-200 flex flex-col justify-center items-center py-6 px-4 sm:py-12 sm:px-6 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      <div className="w-full max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <header className="w-full py-3 px-4 sm:py-4 sm:px-6 flex justify-between items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Lima</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200 border border-blue-300 dark:border-blue-800 whitespace-nowrap">
              Voice AI
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={iconButton}
              title="Toggle Theme"
              aria-label="Toggle Theme"
            >
              {darkMode ? (
                <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                <svg className="w-5 h-5 fill-current text-slate-700" viewBox="0 0 24 24">
                  <path d="M12.3 2a10 10 0 00-1.9 20 10 10 0 0010.5-11 8.3 8.3 0 01-8.6-9z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => setShowInstructions(true)}
              className={iconButton}
              title="Instructions"
              aria-label="Instructions"
            >
              <svg className="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </button>

            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={iconButton}
              title="View on GitHub"
              aria-label="View Lima on GitHub"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.17c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 015.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.51 11.51 0 0023.5 12C23.5 5.65 18.35.5 12 .5z" />
              </svg>
            </a>
          </div>
        </header>

        <main className="text-center p-5 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-5 sm:space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-2 text-slate-900 dark:text-white">
              Meet Lima • AI Voice Assistant
            </h2>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Speak your thoughts and watch Lima structure them into actionable notes and key results.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 py-2 sm:py-4">
            <button
              onClick={handleRecordClick}
              disabled={loading}
              className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center font-bold text-white text-sm transition-all transform active:scale-95 shadow-xl ${
                isRecording
                  ? 'bg-red-600 ring-4 ring-red-300 dark:ring-red-900 animate-pulse'
                  : loading
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
              }`}
            >
              {loading ? 'Processing...' : isRecording ? 'Stop & Send' : 'Tap to talk'}
            </button>
            {loading && (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                The first request can take up to a minute while the server wakes up.
              </p>
            )}
          </div>

          {error && (
            <div role="alert" className="text-left text-sm font-medium p-4 rounded-xl border border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200 break-words">
              {error}
            </div>
          )}

          {result && (
            <div className="text-left p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 text-slate-900 dark:text-slate-100 break-words">
              <div>
                <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1">Summary</h3>
                <p className="text-sm font-medium leading-relaxed">{result.summary}</p>
              </div>

              {result.action_items && result.action_items.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1">Action Items</h3>
                  <ul className="list-disc list-inside text-sm space-y-1 font-medium">
                    {result.action_items.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.transcript && (
                <details className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <summary className="cursor-pointer font-semibold hover:text-slate-800 dark:hover:text-slate-200">
                    View raw transcript
                  </summary>
                  <p className="mt-2 italic bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-3 rounded-lg border border-slate-200 dark:border-slate-700">{result.transcript}</p>
                </details>
              )}
            </div>
          )}
        </main>
      </div>

      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={() => setShowInstructions(false)}>
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl p-5 sm:p-6 max-w-md w-full max-h-[90dvh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-3">How to use Lima</h3>
            <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 space-y-2.5 mb-6 leading-relaxed">
              <li>Tap the microphone button to start recording your voice note.</li>
              <li>Speak clearly about your project, tasks, or ideas, then tap stop.</li>
              <li>Lima transcribes your speech via Groq Whisper and automatically extracts a summary and actionable tasks.</li>
            </ul>
            <button
              onClick={() => setShowInstructions(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-md"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
