/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Mic, MicOff, Send, Copy, Check, RotateCcw, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

// Global window extension
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [transcript, setTranscript] = useState('');
  const [output, setOutput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript((prev) => prev ? prev + ' ' + currentTranscript : currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setError(`Speech tool error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setError('Your browser does not support voice input. Please type your message.');
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setError(null);
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleTransform = async () => {
    if (!transcript.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      const prompt = `
        You are an expert corporate communications specialist and executive assistant. 
        Your task is to transform the following rough, informal voice note transcript into a polished, professional email.

        ORIGINAL TRANSCRIPT:
        "${transcript}"

        STRICT RULES:
        1. Identify the core message and intent.
        2. Elevate the tone to be polite, clear, and professionally appropriate for a workplace environment.
        3. Remove any filler words, slang, or overly casual phrasing.
        4. Neutralize any frustration or hurry; sound calm and collected.
        5. Format the output with exactly:
           Subject: [Clear, concise subject line]
           Hi [Name/Team],
           [Email Body]
           Best regards,
           [My Name]
        6. Do not invent new information. Use placeholders like [Name] or [Time] if context is missing.
        7. Output ONLY the email.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setOutput(response.text || 'Error generating email. Please try again.');
    } catch (err) {
      console.error('Error transforming email:', err);
      setError('Failed to transform email. Check your connection or try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setTranscript('');
    setOutput('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text-main font-sans flex flex-col">
      {/* Header */}
      <header className="px-10 py-6 border-b border-brand-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-blue to-brand-teal rounded-lg shadow-lg shadow-brand-blue/20"></div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              BWAI Executive Assistant
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-brand-teal/10 text-brand-teal border border-brand-border rounded-full text-xs font-semibold tracking-wider">
            AI SPECIALIST ACTIVE
          </div>
          <button
            onClick={reset}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-brand-text-dim hover:text-brand-text-main"
            title="Reset"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-10 max-w-[1440px] mx-auto w-full">
        {/* Input Section */}
        <section className="flex flex-col h-full">
          <span className="text-[11px] uppercase tracking-[0.1em] text-brand-text-dim mb-3">
            Rough Voice Transcript
          </span>
          <div className="flex-1 bg-brand-card border border-brand-border rounded-xl p-6 flex flex-col shadow-xl shadow-black/20">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Speaking..."
              className="flex-1 bg-transparent border-none resize-none focus:ring-0 text-base leading-relaxed placeholder:text-brand-text-dim/30"
            />
            
            {isListening && (
              <div className="flex gap-1 mt-4">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                    className="w-1.5 h-1.5 bg-brand-teal rounded-full"
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Output Section */}
        <section className="flex flex-col h-full">
          <span className="text-[11px] uppercase tracking-[0.1em] text-brand-text-dim mb-3">
            Refined Output
          </span>
          <AnimatePresence mode="wait">
            {output ? (
              <motion.div
                key="output"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 bg-white/2 border border-brand-border rounded-xl p-6 flex flex-col shadow-xl shadow-black/20 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.05),transparent)]"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="space-y-1">
                    <span className="text-[11px] uppercase tracking-[0.1em] text-brand-text-dim block">
                      Status
                    </span>
                    <span className="text-sm font-medium text-brand-teal flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-brand-teal rounded-full animate-pulse"></div>
                      Transcription Verified
                    </span>
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold text-brand-text-main border border-white/5 transition-all active:scale-95"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-brand-teal" />
                        <span className="text-brand-teal">COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>COPY TO CLIPBOARD</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex-1 rounded-lg overflow-auto">
                  <pre className="whitespace-pre-wrap font-sans text-[15px] leading-[1.6] text-brand-text-main">
                    {output}
                  </pre>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 bg-white/2 border border-brand-border border-dashed rounded-xl flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <Send className="w-6 h-6 text-brand-text-dim" />
                </div>
                <h3 className="text-brand-text-main font-semibold">Awaiting Transform</h3>
                <p className="text-brand-text-dim text-sm mt-1 max-w-[240px]">
                  Your polished communication will appear here.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Footer Controls */}
      <footer className="px-10 pb-10 flex justify-center items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleListening}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isListening 
              ? 'bg-red-500/10 text-red-500 border border-red-500 shadow-lg shadow-red-500/20' 
              : 'bg-brand-teal/10 text-brand-teal border border-brand-teal hover:bg-brand-teal/20'
          }`}
        >
          {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </motion.button>
        
        <button
          disabled={!transcript.trim() || isProcessing}
          onClick={handleTransform}
          className={`h-14 px-8 rounded-full font-bold text-[15px] transition-all flex items-center gap-3 shadow-xl ${
            !transcript.trim() || isProcessing
              ? 'bg-white/5 text-white/20 cursor-not-allowed shadow-none border border-white/5'
              : 'bg-gradient-to-r from-brand-blue to-brand-teal text-[#0f172a] hover:brightness-110 shadow-brand-teal/10'
          }`}
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-[#0f172a]/20 border-t-[#0f172a] rounded-full animate-spin" />
              <span>TRANSFORMING...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>TRANSFORM MESSAGE</span>
            </>
          )}
        </button>
      </footer>

      {error && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
