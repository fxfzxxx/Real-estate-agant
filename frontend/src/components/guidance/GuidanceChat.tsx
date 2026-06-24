'use client';

import { useState, useRef, useEffect } from 'react';
import { GuidanceResponse, Property } from '@/types';
import { sendGuidanceMessage } from '@/lib/api';
import PropertyCard from '@/components/property/PropertyCard';

export default function GuidanceChat() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content:
        "Hi! I'm your AI property guide. Tell me what you're looking for — budget, location, property type, lifestyle needs — and I'll find the best matches for you.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<Record<string, unknown>>({});
  const [matches, setMatches] = useState<Property[]>([]);
  const [buyerStage, setBuyerStage] = useState('');
  const sessionId = useRef(`guidance-${Date.now()}`);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);

    const userMsg = { role: 'user' as const, content: text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res: GuidanceResponse = await sendGuidanceMessage(text, sessionId.current, context);
      setContext(res.updated_context);
      setMatches(res.matched_properties);
      setBuyerStage(res.buyer_stage);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const stageColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    semi_ready: 'bg-amber-100 text-amber-800',
    future: 'bg-sky-100 text-sky-800',
  };
  const stageLabels: Record<string, string> = {
    active: '🟢 Active Buyer',
    semi_ready: '🟡 Semi-Ready',
    future: '🔵 Future Buyer',
  };

  const starters = [
    'I\'m looking for a 3-bedroom house in Kew for around $1.5m',
    'I want an apartment near the city, budget $800k',
    'Looking for an investment property under $700k',
    'First home buyer, budget around $600k',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chat panel */}
      <div className="lg:col-span-2 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-[600px]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold">Buyer Guidance Engine</p>
              <p className="text-emerald-100 text-xs">Conversational AI property matching</p>
            </div>
          </div>
          {buyerStage && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${stageColors[buyerStage] ?? ''}`}>
              {stageLabels[buyerStage] ?? buyerStage}
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                  <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-sm'
                    : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Starters (only on first turn) */}
        {messages.length === 1 && (
          <div className="px-5 pb-3">
            <p className="text-xs text-gray-400 mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {starters.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1.5 hover:bg-emerald-100 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSend} className="border-t border-gray-100 p-4 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your ideal property…"
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-emerald-600 text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Results panel */}
      <div className="overflow-y-auto max-h-[600px] space-y-4">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide px-1">
          {matches.length > 0 ? `${matches.length} Matched Properties` : 'Matched Properties'}
        </h3>
        {matches.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 border border-gray-100 p-8 text-center text-sm text-gray-400">
            Tell me your preferences and I&apos;ll surface the best matching properties here.
          </div>
        ) : (
          matches.map((p) => <PropertyCard key={p.id} property={p} />)
        )}
      </div>
    </div>
  );
}
