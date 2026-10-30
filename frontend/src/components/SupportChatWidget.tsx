import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  X,
  RotateCcw,
  Sparkles,
  MessageSquare,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isRefusal?: boolean;
}

export const SupportChatWidget: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { t, language } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Don't render for unauthenticated visitors
  if (!isAuthenticated) {
    return null;
  }

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    if (text.length > 500) {
      setErrorMessage(t('support.character_count', { count: text.length }));
      return;
    }

    setErrorMessage(null);
    setInputMessage('');

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      // Build history for backend API (bounded to last 6 turns)
      const formattedHistory = newHistory.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await api.post('/support/chat/', {
        message: text,
        language: language,
        history: formattedHistory,
      });

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRefusal: response.data.refusal,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errDetail =
        err?.response?.data?.error ||
        (err?.response?.status === 429
          ? 'Too many requests. Please wait a moment.'
          : t('support.network_error'));
      setErrorMessage(errDetail);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setErrorMessage(null);
  };

  const suggestionChips = [
    t('support.suggest_wallet'),
    t('support.suggest_fee'),
    t('support.suggest_request'),
    t('support.suggest_profile'),
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t('support.open_support')}
        className={`fixed bottom-6 right-6 z-40 p-3.5 rounded-full shadow-xl transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-indigo-500/30 ${
          isOpen
            ? 'bg-slate-800 text-white rotate-90 scale-95'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105 active:scale-95'
        }`}
      >
        {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
      </button>

      {/* Floating Chat Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={t('support.widget_title')}
          className="fixed bottom-22 right-4 sm:right-6 w-[92vw] sm:w-[410px] h-[540px] max-h-[82vh] rounded-3xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col z-50 overflow-hidden transition-all duration-200"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/90 flex items-center justify-center text-white shadow-xs">
                <Bot size={18} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold tracking-tight text-white">
                    {t('support.widget_title')}
                  </h3>
                  <span className="text-[10px] font-semibold bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {t('support.widget_badge')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {user?.role === 'PROFESSIONAL' ? t('nav.role_pro') : t('nav.role_customer')} ·{' '}
                  {language.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handleClearChat}
                title={t('support.clear_chat')}
                aria-label={t('support.clear_chat')}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title={t('support.close_button')}
                aria-label={t('support.close_button')}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {/* Initial Welcome Greeting */}
            {messages.length === 0 && (
              <div className="space-y-4 pt-2">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 mb-2">
                    <Sparkles size={16} />
                    <span className="text-xs font-bold">{t('support.welcome_title')}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {t('support.welcome_message')}
                  </p>
                </div>

                {/* Quick Action Suggestion Chips */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 px-1 block">
                    {t('common.filter')}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestionChips.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(chip)}
                        className="text-left text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700/80 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition-colors"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Message Bubbles */}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-2xs ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : m.isRefusal
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/80 rounded-bl-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60 rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}

            {/* Thinking / Typing Indicator */}
            {isLoading && (
              <div className="flex flex-col items-start">
                <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl rounded-bl-xs px-4 py-3 shadow-2xs">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2">
                      {t('support.thinking')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-start space-x-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Area */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={t('support.input_placeholder')}
                maxLength={500}
                disabled={isLoading}
                className="flex-1 px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 transition-colors"
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                aria-label={t('support.send_button')}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
              >
                <Send size={15} />
              </button>
            </form>

            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-1">
              <span>{t('support.disclaimer')}</span>
              <span>{inputMessage.length}/500</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
