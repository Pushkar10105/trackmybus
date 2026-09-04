// src/components/commuter/ChatWidget.jsx
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Mic, MicOff, Volume2, Bot, User, Sparkles } from 'lucide-react';
import { chatApi } from '../../api/endpoints';

const LANGUAGES = [
  { code: 'en-IN', label: 'English', apiLang: 'en' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)', apiLang: 'hi' },
  { code: 'te-IN', label: 'తెలుగు (Telugu)', apiLang: 'te' },
  { code: 'ta-IN', label: 'தமிழ் (Tamil)', apiLang: 'ta' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)', apiLang: 'kn' },
  { code: 'mr-IN', label: 'मराठी (Marathi)', apiLang: 'mr' },
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
      text: 'Hello! I am your TrackMyBus assistant. Ask me about live bus timings, routes, or report bus issues in your language!',
    },
  ]);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = selectedLang.code;

      recog.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        // Auto-send voice queries
        handleSendMessage(transcript);
      };

      recog.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recog.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recog;
    }
  }, [selectedLang]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = selectedLang.code;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLang.code;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    // Add user message
    const userMsg = { sender: 'user', text: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await chatApi.sendMessage(query, selectedLang.apiLang);
      const botReply = res.reply || 'Sorry, could not process transit request.';
      setMessages((prev) => [...prev, { sender: 'bot', text: botReply }]);
      speakText(botReply);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Sorry, the assistant is busy. Check the live map above for direct ETAs.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-full shadow-2xl transition transform hover:scale-105 active:scale-95 border-2 border-white"
          aria-label="Open Transit AI Assistant"
        >
          <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
          <span className="text-sm font-bold">Ask Bus AI</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[360px] sm:w-[400px] h-[520px] flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between shadow">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center">
                <Bot className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <h4 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  Transit AI Assistant
                  <span className="text-[10px] bg-emerald-800 px-1.5 py-0.5 rounded text-emerald-200">Gemini</span>
                </h4>
                <p className="text-[10px] text-emerald-200">Multilingual & Voice-Enabled</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-emerald-800 rounded-lg transition text-emerald-100 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Language Selector Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium text-[11px]">Language:</span>
            <select
              value={selectedLang.code}
              onChange={(e) => {
                const found = LANGUAGES.find((l) => l.code === e.target.value);
                if (found) setSelectedLang(found);
              }}
              className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50/50 text-xs">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`p-2.5 rounded-2xl max-w-[80%] leading-relaxed relative group ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.sender === 'bot' && (
                    <button
                      onClick={() => speakText(msg.text)}
                      className="text-slate-400 hover:text-emerald-600 ml-1 p-0.5 inline-block"
                      title="Read aloud"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {msg.sender === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs italic pl-8">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Searching bus routes & live ETAs...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions */}
          <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex gap-1 overflow-x-auto text-[11px] whitespace-nowrap scrollbar-none">
            <button
              onClick={() => handleSendMessage('When is the next bus on Route 10H?')}
              className="bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 px-2 py-1 rounded-full text-slate-600 transition"
            >
              Route 10H Next Bus?
            </button>
            <button
              onClick={() => handleSendMessage('Find buses between Secunderabad and Gachibowli')}
              className="bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 px-2 py-1 rounded-full text-slate-600 transition"
            >
              Secunderabad to Gachibowli
            </button>
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-full transition ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'text-slate-500 hover:text-emerald-600 hover:bg-slate-100'
                }`}
                title={isListening ? 'Listening... click to stop' : 'Speak to AI'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            <input
              type="text"
              placeholder={isListening ? 'Listening...' : 'Type or speak your transit query...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={loading || !input.trim()}
              className="p-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
