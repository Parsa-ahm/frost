// Tab: Log — full chronological call history with filters and lead drill-down.

import { useState } from 'react'
import type { CallEvent, IcyLead } from '../../types'
import { dateKey } from '../../utils/stats'
import { fmtDateLong, fmtTime, relativeTime, STATUS_LABEL } from '../lib'

interface LogTabProps {
  leads: Record<string, IcyLead>
  events: CallEvent[]
}

type RangeFilter = 'today' | 'week' | 'month' | 'all'
type StatusFilter = 'all' | CallEvent['outcome']

const RANGES: { id: RangeFilter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'all', label: 'All Time' },
]

const STATUSES: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'no_answer', label: 'No Answer' },
  { id: 'called', label: 'Called' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'qualified', label: 'Qualified' },
]

function rangeCutoff(range: RangeFilter): string {
  const d = new Date()
  if (range === 'week') d.setDate(d.getDate() - 6)
  if (range === 'month') d.setDate(d.getDate() - 29)
  if (range === 'all') return ''
  return dateKey(d)
}

export function LogTab({ leads, events }: LogTabProps) {
  const [range, setRange] = useState<RangeFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null)

  const cutoff = rangeCutoff(range)
  const query = search.trim().toLowerCase()

  const filtered = events
    .filter(e => {
      if (cutoff && dateKey(new Date(e.timestamp)) < cutoff) return false
      if (status !== 'all' && e.outcome !== status) return false
      if (query) {
        const name = leads[e.leadId]?.name.toLowerCase() ?? ''
        if (!name.includes(query)) return false
      }
      return true
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  // group by day, preserving newest-first order
  const groups: { date: string; items: CallEvent[] }[] = []
  for (const e of filtered) {
    const date = dateKey(new Date(e.timestamp))
    const last = groups[groups.length - 1]
    if (last && last.date === date) last.items.push(e)
    else groups.push({ date, items: [e] })
  }

  const detailLead = detailLeadId ? leads[detailLeadId] : undefined

  return (
    <div className="tab-panel">
      <div className="filter-group">
        {RANGES.map(r => (
          <button
            key={r.id}
            className={`filter-btn${range === r.id ? ' active' : ''}`}
            onClick={() => setRange(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="filter-group">
        {STATUSES.map(s => (
          <button
            key={s.id}
            className={`filter-btn${status === s.id ? ' active' : ''}`}
            onClick={() => setStatus(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <input
        className="search-input"
        placeholder="Search by business name..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {detailLead && (
        <LeadDetail
          lead={detailLead}
          events={events.filter(e => e.leadId === detailLead.id)}
          onClose={() => setDetailLeadId(null)}
        />
      )}

      {groups.length === 0 ? (
        <div className="empty-state">No calls match these filters.</div>
      ) : (
        groups.map(g => (
          <section key={g.date} className="log-group">
            <h3 className="log-date-header">
              {fmtDateLong(g.date)} — {g.items.length} call{g.items.length === 1 ? '' : 's'}
            </h3>
            {g.items.map(e => (
              <button key={e.id} className="log-row" onClick={() => setDetailLeadId(e.leadId)}>
                <span className="log-time">{fmtTime(e.timestamp)}</span>
                <span className="status-badge" data-status={e.outcome}>
                  {STATUS_LABEL[e.outcome]}
                </span>
                <span className="log-row-body">
                  <span className="lead-name">{leads[e.leadId]?.name ?? 'Unknown business'}</span>
                  {e.notes && <span className="log-notes">“{e.notes}”</span>}
                </span>
              </button>
            ))}
          </section>
        ))
      )}
    </div>
  )
}

interface LeadDetailProps {
  lead: IcyLead
  events: CallEvent[]
  onClose: () => void
}

function LeadDetail({ lead, events, onClose }: LeadDetailProps) {
  const history = [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return (
    <div className="lead-detail">
      <div className="lead-detail-head">
        <div>
          <div className="lead-name">{lead.name}</div>
          <div className="lead-sub">
            {[lead.address, lead.phone].filter(Boolean).join(' · ')}
          </div>
          <div className="lead-sub">
            {STATUS_LABEL[lead.status]} · Called {lead.callCount}x · last {relativeTime(lead.lastCalled)}
          </div>
        </div>
        <button className="btn-ghost" onClick={onClose}>
          ✕
        </button>
      </div>
      {lead.mapsUrl && (
        <a className="maps-link" href={lead.mapsUrl} target="_blank" rel="noreferrer">
          Open in Maps ↗
        </a>
      )}
      <div className="lead-detail-history">
        {history.map(e => (
          <div key={e.id} className="history-row">
            <span className="log-time">
              {fmtDateLong(dateKey(new Date(e.timestamp)))} · {fmtTime(e.timestamp)}
            </span>
            <span className="status-badge" data-status={e.outcome}>
              {STATUS_LABEL[e.outcome]}
            </span>
            {e.notes && <span className="log-notes">“{e.notes}”</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
