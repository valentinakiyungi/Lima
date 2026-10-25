'use client';

import React, { useState, useEffect } from 'react';

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<{
    transcript?: string;
    summary?: string;
    action_items?: string[];
  } | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'dark bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* Top Header Bar */}
      <header className="w-full max-w-5xl mx-auto py-4 px-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Lima</h1>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200 border border-blue-300 dark:border-blue-800">
            Voice AI
          </span>
        </div>

        {/* Clean Icon Controls */}
        <div className="flex items-center space-x-3">
          {/* Dark / Light Mode Icon Button */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Toggle Theme"
            aria-label="Toggle Theme"
          >
            {darkMode ? (
              /* Sun Icon for Light Mode */
              <svg className="w-5 h-5 fill-current text-yellow-400" viewBox="0 0 24 24">
                <path d="M12 4.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM12 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 18a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm10-8a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM4 12a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zm15.071-7.071a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM6.343 17.657a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zm12.728 12.728a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414zM6.343 6.343a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414z" />
              </svg>
            ) : (
              /* Moon Icon for Dark Mode */
              <svg className="w-5 h-5 fill-current text-gray-700" viewBox="0 0 24 24">
                <path d="M12.3 2a10 10 0 00-1.9 20 10 10 0 0010.5-11 8.3 8.3 0 01-8.6-9z" />
              </svg>
            )}
          </button>

          {/* Instructions Info Icon Button */}
          <button
            onClick={() => setShowInstructions(true)}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Instructions"
            aria-label="Instructions"
          >
            <svg className="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>

          {/* GitHub Icon Button */}
          <a
            href="https://github.com/Valentina14142000/Lima"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="GitHub Repository"
            aria-label="GitHub Repository"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-6 py-12 text-center">
        <h2 className="text-3xl font-extrabold mb-2 text-gray-900 dark:text-white">
          Meet Lima • AI Voice Assistant
        </h2>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-8">
          Speak your thoughts and watch Lima structure them into actionable notes and key results.
        </p>

        {/* Audio Recording Button */}
        <div className="my-8 flex justify-center">
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`w-24 h-24 rounded-full flex items-center justify-center font-bold text-white transition-all transform active:scale-95 shadow-lg ${
              isRecording 
                ? 'bg-red-600 ring-4 ring-red-300 dark:ring-red-900 animate-pulse' 
                : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
            }`}
          >
            {isRecording ? 'Recording...' : 'Tap to talk'}
          </button>
        </div>

        {/* Action Items & Summary Output Container */}
        {result && (
          <div className="mt-8 text-left p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 text-gray-900 dark:text-gray-100">
            <div>
              <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400 mb-1">Summary</h3>
              <p className="text-sm font-medium leading-relaxed">{result.summary}</p>
            </div>

            {result.action_items && result.action_items.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400 mb-1">Action Items</h3>
                <ul className="list-disc list-inside text-sm space-y-1 font-medium">
                  {result.action_items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.transcript && (
              <details className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-800">
                <summary className="cursor-pointer font-semibold hover:text-gray-800 dark:hover:text-gray-200">
                  View raw transcript
                </summary>
                <p className="mt-2 italic bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-3 rounded-lg">{result.transcript}</p>
              </details>
            )}
          </div>
        )}
      </main>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-bold mb-3">How to use Lima</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-2.5 mb-6 leading-relaxed">
              <li>Tap the microphone button to start recording a voice note.</li>
              <li>Speak clearly about your project, tasks, or ideas.</li>
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
