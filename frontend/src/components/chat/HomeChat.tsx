'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { GuidanceResponse, Property } from '@/types';
import { popularProperties, sendGuidanceMessage, submitContact } from '@/lib/api';
import { getSessionId, getStoredContact, storeContact } from '@/lib/session';
import PropertyTile from '@/components/property/PropertyTile';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  properties?: Property[];
};

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /(?:\+?\d[\d\s()-]{6,}\d)/;
const NAME_RE = /(?:my name is|i am|i'm|this is)\s+([A-Za-z][A-Za-z'-]+(?:\s+[A-Za-z][A-Za-z'-]+)?)/i;

const GREETING =
  "Kia ora! I'm the NZ Realty AI assistant. Tell me what you're looking for — budget, location, bedrooms, lifestyle — and I'll match you with the right properties. Here are some of our most popular listings to get you started:";

export default function HomeChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<Record<string, unknown>>({});
  const sessionId = useRef('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionId.current = getSessionId();
    let cancelled = false;
    (async () => {
      let popular: Property[] = [];
      try {
        popular = await popularProperties(4);
      } catch {
        // backend offline – still show the greeting
      }
      if (!cancelled) {
        setMessages([{ role: 'assistant', content: GREETING, properties: popular }]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (messages.length > 1) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /** Detect contact details in a chat message and register them as a lead. */
  async function captureContact(text: string, ctx: Record<string, unknown>) {
    if (ctx.contact_captured) return ctx;
    const email = text.match(EMAIL_RE)?.[0];
    const phone = text.match(PHONE_RE)?.[0];
    if (!email && !phone) return ctx;

    const stored = getStoredContact();
    const name = text.match(NAME_RE)?.[1] ?? stored?.name ?? email?.split('@')[0] ?? 'Chat visitor';
    const finalEmail = email ?? stored?.email;
    if (!finalEmail) {
      // Phone without email – hold until we have an email to key the profile on
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Thanks! Could you also share your email address so our agent can follow up with you?`,
        },
      ]);
      return ctx;
    }

    try {
      await submitContact({
        name,
        email: finalEmail,
        phone: phone ?? stored?.phone,
        message: text,
        source: 'chat',
        preferences: ctx,
      });
      storeContact({ name, email: finalEmail, phone: phone ?? stored?.phone });
      const updated = { ...ctx, contact_captured: true };
      setContext(updated);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Perfect, thanks ${name}! I've passed your details to our agent, who will follow up with hand-picked matches. Keep chatting or try the Discovery Swipe to teach me your taste.`,
        },
      ]);
      return updated;
    } catch {
      return ctx;
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: text }]);

    try {
      const res: GuidanceResponse = await sendGuidanceMessage(text, sessionId.current, context);
      const ctx = { ...res.updated_context, ...(context.contact_captured ? { contact_captured: true } : {}) };
      setContext(ctx);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.reply, properties: res.matched_properties },
      ]);
      await captureContact(text, ctx);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const starters = [
    'A 3-bedroom townhouse in Stonefields around $1.2m',
    'Standalone house in Stonefields, budget up to 2m',
    'Apartment in Stonefields, budget $850k',
    'First home in Stonefields, around $750k',
  ];

  return (
    <div className="flex-1 flex flex-col w-full max-w-[900px] mx-auto px-margin-mobile md:px-margin-desktop">
      {/* Messages */}
      <div className="flex-1 py-md space-y-md">
        {messages.length === 0 && (
          <div className="flex justify-center py-lg">
            <span className="material-symbols-outlined animate-pulse text-on-surface-variant text-4xl">forum</span>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center mr-2 mt-1 shrink-0">
                  <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-body-md leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-on-primary rounded-br-sm'
                    : 'bg-surface-container-low text-on-surface border border-outline-variant rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
            {msg.properties && msg.properties.length > 0 && (
              <div className="flex gap-sm overflow-x-auto mt-sm pb-2 pl-10">
                {msg.properties.map((p) => (
                  <PropertyTile key={p.id} property={p} compact />
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start pl-10">
            <div className="bg-surface-container-low border border-outline-variant rounded-xl rounded-bl-sm px-4 py-3 flex gap-1">
              <span className="w-2 h-2 bg-outline rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-outline rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-outline rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Starters */}
      {messages.length <= 1 && (
        <div className="pb-sm">
          <p className="text-label-sm text-on-surface-variant mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {starters.map((s) => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="text-label-sm bg-surface-container text-on-surface-variant border border-outline-variant rounded-full px-3 py-1.5 hover:bg-surface-container-high transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input + mode shortcuts */}
      <div className="sticky bottom-16 md:bottom-0 bg-background pb-md pt-2">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your ideal property, or leave your contact details…"
            className="flex-1 rounded-full border border-outline-variant bg-surface-container px-5 py-3 text-body-md focus:outline-none focus:border-primary focus:ring-0"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-primary text-on-primary rounded-full w-12 h-12 flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
            aria-label="Send"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </form>
        <div className="hidden md:flex gap-sm mt-sm justify-center">
          <Link
            href="/discover"
            className="text-label-md text-primary border border-outline-variant rounded-full px-4 py-1.5 hover:bg-surface-container-high transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[18px]">swipe</span> Discovery Swipe
          </Link>
          <Link
            href="/browse"
            className="text-label-md text-primary border border-outline-variant rounded-full px-4 py-1.5 hover:bg-surface-container-high transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[18px]">explore</span> Browse all listings
          </Link>
        </div>
      </div>
    </div>
  );
}
