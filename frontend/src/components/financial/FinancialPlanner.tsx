'use client';

import { useState } from 'react';
import { AffordabilityEstimate } from '@/types';
import { estimateAffordability, createBuyer } from '@/lib/api';

function fmt(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

export default function FinancialPlanner() {
  const [step, setStep] = useState<'form' | 'result'>('form');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AffordabilityEstimate | null>(null);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    annual_income: '',
    monthly_expenses: '',
    current_savings: '',
    monthly_savings_rate: '',
    has_existing_debt: false,
    debt_monthly: '',
    first_home_buyer: true,
    deposit_pct: '20',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Create / look up buyer
      const buyer = await createBuyer({ name: form.name, email: form.email });
      const estimate = await estimateAffordability({
        buyer_id: buyer.id,
        annual_income: Number(form.annual_income),
        monthly_expenses: Number(form.monthly_expenses),
        current_savings: Number(form.current_savings),
        monthly_savings_rate: Number(form.monthly_savings_rate),
        deposit_target_pct: Number(form.deposit_pct) / 100,
        has_existing_debt: form.has_existing_debt,
        debt_monthly: form.has_existing_debt ? Number(form.debt_monthly) : 0,
        first_home_buyer: form.first_home_buyer,
      });
      setResult(estimate);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'result' && result) {
    const progress = Math.min(
      100,
      result.current_savings_gap <= 0
        ? 100
        : Math.round((1 - result.current_savings_gap / result.deposit_needed) * 100)
    );

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Message banner */}
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6">
          <p className="text-emerald-800 text-sm leading-relaxed">{result.message}</p>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Borrowing Power', value: fmt(result.borrowing_power), color: 'text-emerald-700' },
            { label: 'Deposit Needed', value: fmt(result.deposit_needed), color: 'text-gray-800' },
            { label: 'Ready Price Min', value: fmt(result.ready_price_min), color: 'text-sky-700' },
            { label: 'Ready Price Max', value: fmt(result.ready_price_max), color: 'text-sky-700' },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wide">{m.label}</p>
              <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Savings progress */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-2">
            <p className="font-semibold text-gray-700">Deposit Progress</p>
            <p className="text-sm font-bold text-emerald-700">{progress}%</p>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>Current savings gap: {fmt(Math.max(result.current_savings_gap, 0))}</span>
            <span>
              {result.months_to_deposit < 999
                ? `~${result.months_to_deposit} months to deposit`
                : 'Increase savings rate'}
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          <p className="font-semibold text-gray-700 mb-4">Your Journey</p>
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-0 before:h-full before:w-0.5 before:bg-gray-100">
            {[
              { label: 'Today', sub: 'Financial profile created', done: true },
              { label: 'Ongoing', sub: 'Receive market insights & property alerts', done: false },
              {
                label: result.estimated_ready_months < 999
                  ? `In ~${result.estimated_ready_months} months`
                  : 'Future',
                sub: `Enter market at ${fmt(result.ready_price_min)}–${fmt(result.ready_price_max)}`,
                done: false,
              },
              { label: 'Settlement', sub: 'Close the deal with your agent 🎉', done: false },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                    step.done
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'bg-white border-gray-300'
                  }`}
                />
                <div>
                  <p className={`text-sm font-semibold ${step.done ? 'text-emerald-700' : 'text-gray-700'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-400">{step.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => { setStep('form'); setResult(null); }}
          className="text-sm text-emerald-600 hover:underline"
        >
          ← Recalculate
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      {/* Contact */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Your Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Full Name', name: 'name', type: 'text', placeholder: 'Jane Smith' },
            { label: 'Email', name: 'email', type: 'email', placeholder: 'jane@email.com' },
          ].map((f) => (
            <div key={f.name}>
              <label className="block text-sm text-gray-600 mb-1">{f.label}</label>
              <input
                required
                type={f.type}
                name={f.name}
                value={(form as unknown as Record<string, string>)[f.name]}
                onChange={handleChange}
                placeholder={f.placeholder}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Income & expenses */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Income & Expenses</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Annual Income ($)', name: 'annual_income', placeholder: '95000' },
            { label: 'Monthly Expenses ($)', name: 'monthly_expenses', placeholder: '2500' },
            { label: 'Current Savings ($)', name: 'current_savings', placeholder: '50000' },
            { label: 'Monthly Savings Rate ($)', name: 'monthly_savings_rate', placeholder: '2000' },
          ].map((f) => (
            <div key={f.name}>
              <label className="block text-sm text-gray-600 mb-1">{f.label}</label>
              <input
                required
                type="number"
                name={f.name}
                min="0"
                value={(form as unknown as Record<string, string>)[f.name]}
                onChange={handleChange}
                placeholder={f.placeholder}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Preferences</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Deposit Target</label>
            <select
              name="deposit_pct"
              value={form.deposit_pct}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="10">10%</option>
              <option value="15">15%</option>
              <option value="20">20%</option>
              <option value="25">25%</option>
            </select>
          </div>
          {form.has_existing_debt && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Monthly Debt Repayment ($)</label>
              <input
                type="number"
                name="debt_monthly"
                min="0"
                value={form.debt_monthly}
                onChange={handleChange}
                placeholder="500"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          )}
        </div>
        <div className="flex gap-6 flex-wrap">
          {[
            { label: 'First Home Buyer', name: 'first_home_buyer' },
            { label: 'Have Existing Debt', name: 'has_existing_debt' },
          ].map((c) => (
            <label key={c.name} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                name={c.name}
                checked={(form as unknown as Record<string, boolean>)[c.name]}
                onChange={handleChange}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-400"
              />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl py-3 transition-colors disabled:opacity-50"
      >
        {loading ? 'Calculating…' : 'Calculate My Readiness'}
      </button>
    </form>
  );
}
