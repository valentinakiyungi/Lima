'use client';

import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    transcript?: string;
    summary?: string;
    action_items?: string[];
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioToBackend(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Microphone access denied or not supported.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
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

  const sendAudioToBackend = async (audioBlob: Blob) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", audioBlob, "voice_note.webm");
    formData.append("user_id", "val_123");

    try {
      const response = await fetch(`${API_BASE_URL}/chat/voice`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process voice note on backend.");
      }

      const data = await response.json();
      setResult({
        transcript: data.transcript,
        summary: data.summary,
        action_items: data.action_items,
      });
    } catch (err) {
      console.error("Backend error:", err);
      alert("Error processing voice note with backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 flex flex-col justify-center items-center py-12 px-6 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      
      {/* Centered Wrapper */}
      <div className="w-full max-w-2xl mx-auto space-y-6">

        {/* Top Header Bar */}
        <header className="w-full py-4 px-6 flex justify-between items-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Lima</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200 border border-blue-300 dark:border-blue-800">
              Voice AI
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Toggle Theme"
              aria-label="Toggle Theme"
            >
              {darkMode ? (
                <svg className="w-5 h-5 fill-current text-yellow-400" viewBox="0 0 24 24">
                  <path d="M12 4.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM12 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 18a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm10-8a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM4 12a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zm15.071-7.071a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM6.343 17.657a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zm12.728 12.728a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414zM6.343 6.343a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 fill-current text-slate-700" viewBox="0 0 24 24">
                  <path d="M12.3 2a10 10 0 00-1.9 20 10 10 0 0010.5-11 8.3 8.3 0 01-8.6-9z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => setShowInstructions(true)}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
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
              href="https://github.com/Valentina14142000/Lima"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="GitHub Repository"
              aria-label="GitHub Repository"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        </header>

        {/* Main Content Card */}
        <main className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
          <div>
            <h2 className="text-3xl font-extrabold mb-2 text-slate-900 dark:text-white">
              Meet Lima • AI Voice Assistant
            </h2>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Speak your thoughts and watch Lima structure them into actionable notes and key results.
            </p>
          </div>

          {/* Audio Recording Button */}
          <div className="flex justify-center py-4">
            <button
              onClick={handleRecordClick}
              disabled={loading}
              className={`w-28 h-28 rounded-full flex items-center justify-center font-bold text-white text-sm transition-all transform active:scale-95 shadow-xl ${
                isRecording 
                  ? 'bg-red-600 ring-4 ring-red-300 dark:ring-red-900 animate-pulse' 
                  : loading 
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
              }`}
            >
              {loading ? 'Processing...' : isRecording ? 'Stop & Send' : 'Tap to talk'}
            </button>
          </div>

          {/* Action Items & Summary Output Container */}
          {result && (
            <div className="text-left p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 text-slate-900 dark:text-slate-100">
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

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800">
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
