'use client';

import { useState, useEffect } from 'react';
import { Lead } from '@/types';
import { listLeads, updateLead, logLeadAction } from '@/lib/api';

const TEMP_COLORS: Record<string, string> = {
  hot: 'bg-red-100 text-red-700',
  warm: 'bg-amber-100 text-amber-700',
  cold: 'bg-sky-100 text-sky-700',
};

const STAGES = ['new', 'contacted', 'viewing', 'offer', 'closed'];

function ScoreMeter({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-amber-500' : 'bg-sky-400';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-600">{score}</span>
    </div>
  );
}

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ temperature: string; stage: string }>({ temperature: '', stage: '' });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [stageInput, setStageInput] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await listLeads({
          temperature: filter.temperature || undefined,
          stage: filter.stage || undefined,
        });
        setLeads(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filter]);

  async function handleAction(leadId: number, action: string) {
    const updated = await logLeadAction(leadId, action);
    setLeads((prev) => prev.map((l) => l.id === leadId ? updated : l));
    if (selectedLead?.id === leadId) setSelectedLead(updated);
  }

  async function handleSaveNotes() {
    if (!selectedLead) return;
    const updated = await updateLead(selectedLead.id, {
      notes: noteInput,
      stage: stageInput || selectedLead.stage,
    });
    setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? updated : l));
    setSelectedLead(updated);
  }

  function openLead(lead: Lead) {
    setSelectedLead(lead);
    setNoteInput(lead.notes ?? '');
    setStageInput(lead.stage);
  }

  const hot = leads.filter((l) => l.temperature === 'hot').length;
  const warm = leads.filter((l) => l.temperature === 'warm').length;
  const cold = leads.filter((l) => l.temperature === 'cold').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Agent CRM Dashboard</h1>
        <p className="text-gray-500 mt-1">AI-scored lead pipeline with automated next-action suggestions.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: '🔥 Hot Leads', count: hot, color: 'border-red-200 bg-red-50 text-red-700' },
          { label: '🌡 Warm Leads', count: warm, color: 'border-amber-200 bg-amber-50 text-amber-700' },
          { label: '❄️ Cold Leads', count: cold, color: 'border-sky-200 bg-sky-50 text-sky-700' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border-2 ${s.color} p-5 text-center`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-sm font-semibold mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={filter.temperature}
          onChange={(e) => setFilter((prev) => ({ ...prev, temperature: e.target.value }))}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">All temperatures</option>
          <option value="hot">🔥 Hot</option>
          <option value="warm">🌡 Warm</option>
          <option value="cold">❄️ Cold</option>
        </select>
        <select
          value={filter.stage}
          onChange={(e) => setFilter((prev) => ({ ...prev, stage: e.target.value }))}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <button
          onClick={() => setFilter({ temperature: '', stage: '' })}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Clear filters
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead table */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-3">🤝</p>
              <p>No leads yet. They&apos;ll appear here as buyers interact with listings.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Buyer</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">Source</th>
                    <th className="text-left px-4 py-3">Score</th>
                    <th className="text-left px-4 py-3">Stage</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Next Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => openLead(lead)}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedLead?.id === lead.id ? 'bg-emerald-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${lead.temperature === 'hot' ? 'bg-red-500' : lead.temperature === 'warm' ? 'bg-amber-400' : 'bg-sky-400'}`} />
                          <div>
                            <p className="font-medium text-gray-800">{lead.buyer?.name ?? `Buyer #${lead.buyer_id}`}</p>
                            <p className="text-xs text-gray-400 hidden sm:block">{lead.buyer?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 capitalize hidden sm:table-cell">
                        {lead.source?.replace('_', ' ') ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <ScoreMeter score={lead.score} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${TEMP_COLORS[lead.temperature]}`}>
                          {lead.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate hidden md:table-cell">
                        {lead.next_action ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Lead detail panel */}
        <div>
          {selectedLead ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{selectedLead.buyer?.name}</h3>
                  <p className="text-sm text-gray-400">{selectedLead.buyer?.email}</p>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${TEMP_COLORS[selectedLead.temperature]}`}>
                  {selectedLead.temperature.toUpperCase()}
                </span>
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Intent Score</p>
                <ScoreMeter score={selectedLead.score} />
              </div>

              {/* Quick actions */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Log Action</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Call', 'Email', 'Showing', 'Offer'].map((action) => (
                    <button
                      key={action}
                      onClick={() => handleAction(selectedLead.id, action.toLowerCase())}
                      className="text-xs bg-gray-50 border border-gray-200 rounded-xl py-2 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors font-medium"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stage */}
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Pipeline Stage</label>
                <select
                  value={stageInput}
                  onChange={(e) => setStageInput(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Notes</label>
                <textarea
                  rows={3}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                  placeholder="Add notes about this lead…"
                />
              </div>

              <button
                onClick={handleSaveNotes}
                className="w-full bg-emerald-600 text-white font-semibold rounded-xl py-2.5 text-sm hover:bg-emerald-700 transition-colors"
              >
                Save
              </button>

              {/* Behaviour log */}
              {selectedLead.behaviors.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Behaviour Log</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {[...selectedLead.behaviors].reverse().map((b, i) => (
                      <p key={i} className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">{b}</p>
                    ))}
                  </div>
                </div>
              )}

              {selectedLead.next_action && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-800 mb-0.5">Suggested Next Action</p>
                  <p className="text-xs text-amber-700">{selectedLead.next_action}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
              <p className="text-4xl mb-3">👆</p>
              <p className="text-sm">Click a lead to view details and log actions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
