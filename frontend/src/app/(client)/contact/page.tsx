'use client';

import { useState } from 'react';
import { submitContact } from '@/lib/api';
import { storeContact } from '@/lib/session';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await submitContact({ ...form, source: 'contact_page' });
      storeContact({ name: form.name, email: form.email, phone: form.phone || undefined });
      setDone(true);
    } catch {
      setError('Something went wrong sending your message. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex-1 w-full max-w-[900px] mx-auto px-margin-mobile md:px-margin-desktop py-md">
      <header className="mb-md">
        <h1 className="text-headline-lg-mobile md:text-headline-xl text-primary mb-xs">Get in Touch</h1>
        <p className="text-body-lg text-on-surface-variant">
          Leave your details and a message — our agent will get back to you within 24 hours.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-md items-start">
        {/* Form */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
          {done ? (
            <div className="text-center py-lg">
              <span className="material-symbols-outlined text-5xl text-primary mb-sm">mark_email_read</span>
              <p className="text-body-lg font-semibold text-on-surface">Message sent!</p>
              <p className="text-label-md text-on-surface-variant mt-1">
                Thanks {form.name} — our agent will be in touch shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-sm">
              {[
                { label: 'Name', field: 'name', type: 'text', placeholder: 'Jane Smith', required: true },
                { label: 'Email', field: 'email', type: 'email', placeholder: 'jane@email.com', required: true },
                { label: 'Phone', field: 'phone', type: 'tel', placeholder: '021 000 0000', required: false },
              ].map((f) => (
                <div key={f.field}>
                  <label className="block text-label-sm text-on-surface-variant mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    required={f.required}
                    placeholder={f.placeholder}
                    value={(form as Record<string, string>)[f.field]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.field]: e.target.value }))}
                    className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-body-md focus:outline-none focus:border-primary focus:ring-0"
                  />
                </div>
              ))}
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1">Message</label>
                <textarea
                  rows={4}
                  placeholder="Tell us what you're looking for, or ask about a listing…"
                  value={form.message}
                  onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                  className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-body-md focus:outline-none focus:border-primary focus:ring-0 resize-none"
                />
              </div>
              {error && <p className="text-label-md text-error">{error}</p>}
              <button
                type="submit"
                disabled={sending}
                className="w-full bg-primary text-on-primary rounded-lg py-3 text-label-md font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {sending ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          )}
        </div>

        {/* Other ways to reach us */}
        <div className="space-y-sm">
          {[
            { icon: 'call', title: 'Call us', detail: '+64 21 000 0000', href: 'tel:+64210000000' },
            { icon: 'sms', title: 'Text us', detail: '+64 21 000 0000', href: 'sms:+64210000000' },
            { icon: 'mail', title: 'Email', detail: 'hello@nzrealty.co.nz', href: 'mailto:hello@nzrealty.co.nz' },
          ].map((c) => (
            <a
              key={c.title}
              href={c.href}
              className="flex items-center gap-sm bg-surface-container-low border border-outline-variant rounded-xl px-md py-sm hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-primary">{c.icon}</span>
              <span>
                <span className="block text-label-md font-semibold text-on-surface">{c.title}</span>
                <span className="block text-label-md text-on-surface-variant">{c.detail}</span>
              </span>
            </a>
          ))}
          <div className="bg-primary-container text-white rounded-xl p-md">
            <p className="text-label-md font-semibold mb-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">smart_toy</span> Prefer to chat?
            </p>
            <p className="text-label-md text-white/80">
              Our AI assistant can answer questions instantly, 24/7 — and pass your details to the
              agent when you&apos;re ready.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
