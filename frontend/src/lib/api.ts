// API client – centralised fetch helpers

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Properties ──────────────────────────────────────────────────────────────

export type PropertyFilters = {
  suburb?: string;
  state?: string;
  status?: string;
  property_type?: string;
  price_min?: number;
  price_max?: number;
  bedrooms_min?: number;
  skip?: number;
  limit?: number;
};

export function listProperties(filters: PropertyFilters = {}) {
  const params = new URLSearchParams(
    Object.entries(filters)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => [k, String(v)])
  );
  return apiFetch<import('@/types').Property[]>(`/properties?${params}`);
}

export function getProperty(id: number) {
  return apiFetch<import('@/types').Property>(`/properties/${id}`);
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export function sendChatMessage(
  propertyId: number,
  message: string,
  sessionId: string,
  buyerId?: number
) {
  return apiFetch<import('@/types').ChatResponse>(
    `/properties/${propertyId}/chat`,
    {
      method: 'POST',
      body: JSON.stringify({ message, session_id: sessionId, buyer_id: buyerId }),
    }
  );
}

export function getChatHistory(propertyId: number, sessionId: string) {
  return apiFetch<import('@/types').ChatMessage[]>(
    `/properties/${propertyId}/chat/history?session_id=${sessionId}`
  );
}

// ── Enquiry ──────────────────────────────────────────────────────────────────

export function submitEnquiry(
  propertyId: number,
  data: { name: string; email: string; phone?: string; message?: string }
) {
  return apiFetch(`/properties/${propertyId}/enquiries`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Guidance engine ──────────────────────────────────────────────────────────

export function sendGuidanceMessage(
  message: string,
  sessionId: string,
  context: Record<string, unknown> = {},
  buyerId?: number
) {
  return apiFetch<import('@/types').GuidanceResponse>('/guidance', {
    method: 'POST',
    body: JSON.stringify({ message, session_id: sessionId, context, buyer_id: buyerId }),
  });
}

// ── CRM ──────────────────────────────────────────────────────────────────────

export function listLeads(filters: { temperature?: string; stage?: string } = {}) {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, v as string])
  );
  return apiFetch<import('@/types').Lead[]>(`/crm/leads?${params}`);
}

export function listBuyers(stage?: string) {
  const params = stage ? `?stage=${stage}` : '';
  return apiFetch<import('@/types').Buyer[]>(`/crm/buyers${params}`);
}

export function updateLead(
  leadId: number,
  data: { stage?: string; notes?: string; score?: number; temperature?: string; next_action?: string }
) {
  return apiFetch<import('@/types').Lead>(`/crm/leads/${leadId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function logLeadAction(leadId: number, action: string) {
  return apiFetch<import('@/types').Lead>(`/crm/leads/${leadId}/actions?action=${encodeURIComponent(action)}`, {
    method: 'POST',
  });
}

// ── Popular properties & discovery recommendations ──────────────────────────

export function popularProperties(limit = 4) {
  return apiFetch<import('@/types').Property[]>(`/properties/popular?limit=${limit}`);
}

export function trendingProperties(limit = 4) {
  return apiFetch<import('@/types').TrendingProperty[]>(`/properties/trending?limit=${limit}`);
}

export function getRecommendations(sessionId: string, limit = 10) {
  return apiFetch<import('@/types').Property[]>(
    `/recommendations?session_id=${encodeURIComponent(sessionId)}&limit=${limit}`
  );
}

export function recordSwipe(data: {
  property_id: number;
  session_id: string;
  liked: boolean;
  buyer_id?: number;
}) {
  return apiFetch('/recommendations/swipe', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getLikedProperties(sessionId: string) {
  return apiFetch<import('@/types').Property[]>(
    `/recommendations/liked?session_id=${encodeURIComponent(sessionId)}`
  );
}

// ── Contact capture ──────────────────────────────────────────────────────────

export function submitContact(data: {
  name: string;
  email: string;
  phone?: string;
  message?: string;
  source?: string;
  preferences?: Record<string, unknown>;
}) {
  return apiFetch<import('@/types').ContactMessage>('/contact', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Admin ────────────────────────────────────────────────────────────────────

export function getAdminSummary() {
  return apiFetch<import('@/types').AdminSummary>('/admin/summary');
}

export function getPropertyPopularity() {
  return apiFetch<import('@/types').PropertyPopularity[]>('/admin/property-popularity');
}

export function getDeals() {
  return apiFetch<import('@/types').DealStage[]>('/admin/deals');
}

export function listActions(status?: string) {
  const params = status ? `?status=${status}` : '';
  return apiFetch<import('@/types').AgentAction[]>(`/admin/actions${params}`);
}

export function generateActions() {
  return apiFetch<import('@/types').AgentAction[]>('/admin/actions/generate', {
    method: 'POST',
  });
}

export function updateAction(actionId: number, status: string) {
  return apiFetch<import('@/types').AgentAction>(`/admin/actions/${actionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function getActionsSummary() {
  return apiFetch<import('@/types').ActionSummary>('/admin/actions/summary');
}

// ── Market ───────────────────────────────────────────────────────────────────

export function listMarketSnapshots(state?: string) {
  const params = state ? `?state=${state}` : '';
  return apiFetch<import('@/types').MarketSnapshot[]>(`/market/suburbs${params}`);
}

export function getSuburbSnapshot(suburb: string) {
  return apiFetch<import('@/types').MarketSnapshot>(`/market/suburbs/${suburb}`);
}

export function getComparableListings(propertyId: number) {
  return apiFetch<import('@/types').Property[]>(`/market/comparable/${propertyId}`);
}

// ── Financial planning ────────────────────────────────────────────────────────

export type FinancialInput = {
  buyer_id: number;
  annual_income: number;
  monthly_expenses: number;
  current_savings: number;
  monthly_savings_rate: number;
  deposit_target_pct?: number;
  target_purchase_price?: number;
  has_existing_debt?: boolean;
  debt_monthly?: number;
  first_home_buyer?: boolean;
};

export function estimateAffordability(data: FinancialInput) {
  return apiFetch<import('@/types').AffordabilityEstimate>('/financial/estimate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function createBuyer(data: { name: string; email: string; phone?: string }) {
  return apiFetch<import('@/types').Buyer>('/crm/buyers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
