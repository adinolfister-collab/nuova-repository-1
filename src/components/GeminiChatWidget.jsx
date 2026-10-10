import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Minus,
  Maximize2,
  Minimize2,
  Send,
  Code2,
  FileText,
  MessageSquare,
  Copy,
  Check,
  RotateCcw,
  Bot,
  User,
  Loader2,
  ChevronDown
} from 'lucide-react';

const STORAGE_KEY = 'ibd_gemini_chat_history';
const STORAGE_OPEN = 'ibd_gemini_chat_open';
const STORAGE_MODE = 'ibd_gemini_chat_mode';

export default function GeminiChatWidget() {
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_OPEN) === '1';
    } catch {
      return false;
    }
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_MODE) || 'code';
    } catch {
      return 'code';
    }
  });

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        role: 'model',
        content:
          'Ciao! Sono Gemini AI. Posso generare per te **codice** (React, TypeScript, CSS, algoritmi) oppure **testi** (report per visite, note, articoli e documentazione). Di cosa hai bisogno?',
        timestamp: new Date().toISOString(),
      },
    ];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_OPEN, isOpen ? '1' : '0');
    } catch {}
  }, [isOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MODE, mode);
    } catch {}
  }, [mode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  const handleSend = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      // Send conversation history to server-side Gemini API endpoint
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          mode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Errore nella generazione del testo/codice');
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: data.reply || '(Nessuna risposta generata)',
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: `⚠️ **Errore:** ${err.message || 'Impossibile completare la richiesta. Verifica la connessione e riprova.'}`,
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    const initial = [
      {
        role: 'model',
        content:
          mode === 'code'
            ? 'Chat azzerata. Chiedimi qualsiasi componente, funzione o snippet di codice da generare!'
            : 'Chat azzerata. Dimmi quale testo, riassunto o documento desideri redigere.',
        timestamp: new Date().toISOString(),
      },
    ];
    setMessages(initial);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    } catch {}
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const quickPrompts = {
    code: [
      'Genera una funzione per calcolare il trend dei sintomi settimanali',
      'Crea un componente React per la selezione della scala del dolore (0-10)',
      'Scrivi una regex per convalidare valori di esami del sangue',
    ],
    text: [
      'Scrivi un report sintetico ed efficace per la visita gastroenterologica',
      'Redigi una lista di cibi sicuri e linee guida per la fase di remissione',
      'Scrivi un promemoria per l\'assunzione puntuale dei farmaci biologici',
    ],
    general: [
      'Quali sono i parametri chiave da monitorare in un diario IBD?',
      'Spiegami la differenza tra Morbo di Crohn e Colite Ulcerosa',
      'Come posso preparare al meglio il referto degli esami?',
    ],
  };

  // Helper to render message content with formatted code blocks
  const renderMessageContent = (content, msgIdx) => {
    const parts = [];
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const textBefore = content.slice(lastIndex, match.index);
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
      parts.push({
        type: 'code',
        lang: match[1] || 'code',
        code: match[2],
      });
      lastIndex = match.index + match[0].length;
    }

    const textRemaining = content.slice(lastIndex);
    if (textRemaining) {
      parts.push({ type: 'text', content: textRemaining });
    }

    return (
      <div className="space-y-2 text-sm leading-relaxed break-words">
        {parts.map((p, idx) => {
          if (p.type === 'code') {
            const blockId = `${msgIdx}-${idx}`;
            const isCopied = copiedIndex === blockId;
            return (
              <div
                key={idx}
                className="my-2.5 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shadow-sm"
              >
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 text-xs text-slate-300 font-mono border-b border-slate-700">
                  <span className="uppercase font-semibold text-[10px] tracking-wider text-emerald-400">
                    {p.lang}
                  </span>
                  <button
                    onClick={() => copyToClipboard(p.code, blockId)}
                    className="flex items-center gap-1 text-[11px] hover:text-white transition-colors cursor-pointer text-slate-400"
                    title="Copia codice"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiato!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copia</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 text-xs text-slate-200 overflow-x-auto font-mono leading-normal selection:bg-emerald-800 selection:text-white">
                  <code>{p.code}</code>
                </pre>
              </div>
            );
          }

          // Format basic bold, italic and bullet lists for regular text
          const lines = p.content.split('\n');
          return (
            <div key={idx} className="space-y-1">
              {lines.map((line, lIdx) => {
                if (line.startsWith('### ')) {
                  return (
                    <h4 key={lIdx} className="font-bold text-base mt-2 text-slate-100">
                      {line.replace('### ', '')}
                    </h4>
                  );
                }
                if (line.startsWith('## ')) {
                  return (
                    <h3 key={lIdx} className="font-bold text-lg mt-2.5 text-slate-100">
                      {line.replace('## ', '')}
                    </h3>
                  );
                }
                if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                  return (
                    <div key={lIdx} className="flex items-start gap-2 pl-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{line.replace(/^(\s*[-*]\s*)/, '')}</span>
                    </div>
                  );
                }
                if (!line.trim()) {
                  return <div key={lIdx} className="h-1.5" />;
                }
                return <p key={lIdx}>{line}</p>;
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <aside aria-label="Assistente AI Gemini" className="fixed bottom-4 right-4 z-50 font-sans">
      {/* Floating trigger button when closed */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 150);
          }}
          className="group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white shadow-xl shadow-teal-900/40 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20 cursor-pointer"
          title="Apri Gemini AI Chat"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 animate-pulse text-amber-200" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
          </div>
          <span className="font-semibold text-sm tracking-wide">Gemini AI</span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium hidden sm:inline">
            Genera Codice &amp; Testi
          </span>
        </button>
      )}

      {/* Floating Chat Container when open */}
      {isOpen && (
        <div
          className={`flex flex-col bg-slate-900 text-slate-100 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
            isExpanded
              ? 'fixed inset-4 sm:inset-6 z-50'
              : 'w-[calc(100vw-2rem)] sm:w-[450px] md:w-[480px] h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/80 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md">
                <Sparkles className="w-4 h-4 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-white">Gemini AI</h3>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/50 px-1.5 py-0.2 rounded font-mono">
                    gemini-3.8-flash
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Generatore Codice &amp; Testi</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <button
                onClick={clearChat}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                title="Nuova conversazione"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                title={isExpanded ? 'Riduci finestra' : 'Espandi a schermo intero'}
              >
                {isExpanded ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                title="Riduci a icona"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="px-3 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center gap-1.5 text-xs shrink-0">
            <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">Modalità:</span>
            <button
              onClick={() => setMode('code')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                mode === 'code'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Codice</span>
            </button>
            <button
              onClick={() => setMode('text')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                mode === 'text'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Testi &amp; Note</span>
            </button>
            <button
              onClick={() => setMode('general')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                mode === 'general'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Generale</span>
            </button>
          </div>

          {/* Message List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-sm bg-gradient-to-b from-slate-900 to-slate-950">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-teal-600/30 border border-teal-500/40 text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-br-xs shadow-md'
                        : msg.isError
                        ? 'bg-rose-950/50 border border-rose-800/60 text-rose-200 rounded-bl-xs'
                        : 'bg-slate-800/90 border border-slate-700/60 text-slate-100 rounded-bl-xs shadow-sm'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : (
                      renderMessageContent(msg.content, index)
                    )}
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/40 border border-indigo-500/40 text-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-lg bg-teal-600/30 border border-teal-500/40 text-teal-300 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-bl-xs px-4 py-3 text-slate-300 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                  <span className="text-xs text-slate-400">Gemini sta elaborando...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 bg-slate-950 border-t border-slate-800/70 overflow-x-auto shrink-0 flex gap-1.5 scrollbar-none">
              {(quickPrompts[mode] || quickPrompts.code).map((promptText, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleSend(promptText)}
                  className="shrink-0 text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white transition-all cursor-pointer whitespace-nowrap"
                >
                  {promptText}
                </button>
              ))}
            </div>
          )}

          {/* Input & Action Bar */}
          <div className="p-3 bg-slate-900 border-t border-slate-700/80 shrink-0">
            <div className="flex items-end gap-2 bg-slate-950 border border-slate-700 rounded-xl p-2 focus-within:border-teal-500 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === 'code'
                    ? 'Chiedi un componente, script o snippet di codice...'
                    : mode === 'text'
                    ? 'Chiedi di scrivere un report, testo o articolo...'
                    : 'Scrivi un messaggio a Gemini...'
                }
                rows={1}
                className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 resize-none outline-none max-h-28 py-1 px-1"
                style={{ minHeight: '24px' }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 flex items-center justify-center hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0 shadow-sm"
                title="Invia"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <Send className="w-4 h-4 text-slate-950" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-500">
              <span>Invio per spedire • Shift + Invio per a capo</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> API Gemini Attive
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
