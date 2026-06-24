// Shared TypeScript types matching backend schemas

export interface Agent {
  id: number;
  name: string;
  email: string;
  phone?: string;
  agency?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Property {
  id: number;
  title: string;
  description?: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  car_spaces: number;
  land_size?: number;
  property_type?: string;
  status: string;
  features: string[];
  images: string[];
  agent_id?: number;
  agent?: Agent;
  days_on_market: number;
  created_at: string;
}

export interface Buyer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  budget_min?: number;
  budget_max?: number;
  preferred_suburbs: string[];
  bedrooms_min?: number;
  property_types: string[];
  lifestyle_tags: string[];
  buyer_stage: 'active' | 'semi_ready' | 'future';
  created_at: string;
}

export interface Lead {
  id: number;
  buyer_id: number;
  agent_id?: number;
  property_id?: number;
  source?: string;
  score: number;
  temperature: 'hot' | 'warm' | 'cold';
  stage: string;
  notes?: string;
  next_action?: string;
  next_action_due?: string;
  behaviors: string[];
  created_at: string;
  buyer?: Buyer;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatResponse {
  reply: string;
  messages: ChatMessage[];
}

export interface GuidanceResponse {
  reply: string;
  matched_properties: Property[];
  updated_context: Record<string, unknown>;
  buyer_stage: string;
}

export interface MarketSnapshot {
  id: number;
  suburb: string;
  state: string;
  median_price?: number;
  avg_days_on_market?: number;
  quarterly_growth_pct?: number;
  annual_growth_pct?: number;
  listings_count: number;
  recorded_at: string;
}

export interface AffordabilityEstimate {
  borrowing_power: number;
  estimated_ready_months: number;
  ready_price_min: number;
  ready_price_max: number;
  deposit_needed: number;
  current_savings_gap: number;
  months_to_deposit: number;
  message: string;
}

export interface FinancialProfile {
  id: number;
  buyer_id: number;
  annual_income: number;
  monthly_expenses: number;
  current_savings: number;
  monthly_savings_rate: number;
  deposit_target_pct: number;
  target_purchase_price?: number;
  has_existing_debt: boolean;
  debt_monthly: number;
  first_home_buyer: boolean;
  estimated_borrowing_power?: number;
  estimated_ready_months?: number;
  estimated_ready_price_min?: number;
  estimated_ready_price_max?: number;
  created_at: string;
  updated_at: string;
}
