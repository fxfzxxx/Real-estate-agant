// Client-side visitor identity: a persistent anonymous session id plus any
// contact details the visitor has shared (via chat or the contact page).

const SESSION_KEY = 'nzrealty-session-id';
const CONTACT_KEY = 'nzrealty-contact';

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export type StoredContact = { name: string; email: string; phone?: string };

export function getStoredContact(): StoredContact | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(CONTACT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredContact;
  } catch {
    return null;
  }
}

export function storeContact(contact: StoredContact) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONTACT_KEY, JSON.stringify(contact));
}
