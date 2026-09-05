// src/components/commuter/ChatWidget.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, ArrowUp, Mic, MicOff, Bus, MessageSquare } from 'lucide-react';
import { chatApi } from '../../api/endpoints';

const LANGUAGES = [
  { code: 'en', label: 'English', speechCode: 'en-IN' },
  { code: 'hi', label: 'Hindi (हिन्दी)', speechCode: 'hi-IN' },
  { code: 'te', label: 'Telugu (తెలుగు)', speechCode: 'te-IN' },
  { code: 'ta', label: 'Tamil (தமிழ்)', speechCode: 'ta-IN' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)', speechCode: 'kn-IN' },
  { code: 'mr', label: 'Marathi (मराठी)', speechCode: 'mr-IN' },
];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hello! I'm your Hyderabad Transit AI assistant. I can help with live bus timings, connecting routes, stops, and service alerts.",
    },
  ]);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = selectedLang.speechCode;

      recog.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        handleSendMessage(transcript);
      };

      recog.onerror = () => setIsListening(false);
      recog.onend = () => setIsListening(false);

      recognitionRef.current = recog;
    }
  }, [selectedLang]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  const toggleVoiceMic = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = selectedLang.speechCode;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech recognition error:', err);
      }
    }
  };

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    // Add user message
    const userMsg = { sender: 'user', text: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await chatApi.sendMessage(query, selectedLang.code);
      const reply = res?.reply || res?.message || "I'm having trouble retrieving live coordinates. Please verify corridor status.";
      setMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: "I'm currently unable to connect to the transit reasoning engine. Please try asking again shortly.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Assistant Chat Bubble Button (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-30 pointer-events-auto select-none">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 bg-black hover:bg-black-elevated text-white rounded-full shadow-uber-elevated flex items-center justify-center transition-all hover:scale-105 active:scale-95 relative group"
          title="Open Transit Assistant"
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Sparkles className="w-6 h-6 text-white" />
          )}
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
          {!isOpen && (
            <span className="absolute right-16 bg-black text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
              Transit Assistant
            </span>
          )}
        </button>
      </div>

      {/* AI Transit Assistant Slide-Out Drawer Widget */}
      {isOpen && (
        <aside className="fixed bottom-6 right-6 z-40 w-[calc(100%-2rem)] sm:w-[395px] max-h-[85vh] h-[550px] bg-white/98 backdrop-blur-2xl rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.22)] border border-black/10 flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-3.5 px-4 bg-white border-b border-black/5 flex items-center justify-between select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-xs text-ink font-display">Transit Assistant</h4>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live
                  </span>
                </div>
                <p className="text-[10px] text-body-muted">Hyderabad Transit AI • Real-time</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedLang.code}
                onChange={(e) => {
                  const lang = LANGUAGES.find((l) => l.code === e.target.value);
                  if (lang) setSelectedLang(lang);
                }}
                className="bg-canvas-soft hover:bg-canvas-softer text-[11px] font-semibold text-ink rounded-full py-1 pl-2.5 pr-6 appearance-none border-0 cursor-pointer focus:ring-1 focus:ring-black transition-colors"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setIsOpen(false)}
                className="icon-btn h-7 w-7 rounded-full bg-canvas-soft hover:bg-surface-pressed flex items-center justify-center text-ink text-xs transition-colors"
                title="Close Assistant"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {messages.map((m, idx) => (
              <div
                key={`msg-${idx}`}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'items-start gap-2.5 max-w-[92%]'}`}
              >
                {m.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`p-3 leading-relaxed whitespace-pre-wrap ${
                    m.sender === 'user'
                      ? 'bg-black text-white rounded-2xl rounded-tr-sm max-w-[85%] shadow-xs'
                      : 'bg-canvas-soft rounded-2xl rounded-tl-sm text-ink'
                  }`}
                >
                  <p>{m.text}</p>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex items-center gap-2 max-w-[70%]">
                <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs flex-shrink-0 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="bg-canvas-soft px-3 py-2.5 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-ink rounded-full dot-1"></span>
                  <span className="w-1.5 h-1.5 bg-ink rounded-full dot-2"></span>
                  <span className="w-1.5 h-1.5 bg-ink rounded-full dot-3"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Strip */}
          <div className="px-4 py-2 bg-white border-t border-black/5 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-[11px] select-none">
            {[
              'Next bus on Route 127K?',
              'How to reach Kondapur?',
              'Report AC problem',
            ].map((prompt, pIdx) => (
              <button
                key={`prompt-${pIdx}`}
                onClick={() => handleSendMessage(prompt)}
                className="bg-canvas-soft hover:bg-black hover:text-white transition-all text-ink px-3 py-1 rounded-full font-medium flex-shrink-0 active:scale-95"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-black/5 flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about routes, bus ETAs, or stops..."
                className="w-full bg-canvas-soft text-xs text-ink placeholder:text-mute rounded-full py-2.5 pl-3.5 pr-10 border-0 focus:ring-1 focus:ring-black"
              />
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleVoiceMic}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full flex items-center justify-center text-body hover:text-ink transition-all relative"
                  title={isListening ? 'Stop listening' : 'Speak your query'}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4 text-red-500" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                  {isListening && (
                    <span className="absolute inset-0 rounded-full border border-red-500 mic-recording-wave pointer-events-none"></span>
                  )}
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="h-9 w-9 bg-black hover:bg-black-elevated text-white rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-sm disabled:opacity-40"
              title="Send Message"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
