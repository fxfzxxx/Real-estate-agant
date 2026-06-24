'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types';
import { sendChatMessage } from '@/lib/api';

interface Props {
  propertyId: number;
  sessionId: string;
}

export default function ChatWidget({ propertyId, sessionId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
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

    // Optimistic user message
    const userMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await sendChatMessage(propertyId, text, sessionId);
      setMessages(res.messages);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: "Sorry, I couldn't reach the server. Please try again.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const quickQuestions = [
    'Is this good for a family?',
    'What are similar homes nearby?',
    'What\'s the investment potential?',
    'How do I arrange an inspection?',
  ];

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-emerald-700 px-4 py-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <div>
          <p className="text-white font-semibold text-sm">AI Property Assistant</p>
          <p className="text-emerald-200 text-xs">Ask me anything about this property</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm mb-4">Hi! I&apos;m your AI assistant for this property.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1.5 hover:bg-emerald-100 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5">
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

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-gray-100 p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this property…"
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-emerald-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
