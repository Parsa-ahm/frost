// Tab: Retry — all no_answer leads, oldest call first.

import { useState } from 'react'
import type { IcyLead } from '../../types'
import { LeadRow } from '../components'
import { relativeTime } from '../lib'

interface RetryTabProps {
  leads: Record<string, IcyLead>
}

const MIN_CALLS: { min: number; label: string }[] = [
  { min: 0, label: 'Any' },
  { min: 2, label: '2+ calls' },
  { min: 3, label: '3+ calls' },
]

export function RetryTab({ leads }: RetryTabProps) {
  const [minCalls, setMinCalls] = useState(0)
  const [search, setSearch] = useState('')
  const [queryFilter, setQueryFilter] = useState('')
  const [leaving, setLeaving] = useState<Set<string>>(new Set())

  const all = Object.values(leads).filter(l => l.status === 'no_answer')
  const searchQueries = [...new Set(all.map(l => l.searchQuery).filter(Boolean))].sort()

  const q = search.trim().toLowerCase()
  const list = all
    .filter(l => l.callCount >= minCalls)
    .filter(l => !q || l.name.toLowerCase().includes(q))
    .filter(l => !queryFilter || l.searchQuery === queryFilter)
    .sort((a, b) => a.lastCalled.localeCompare(b.lastCalled))

  const markLeaving = (id: string) => {
    setLeaving(prev => new Set(prev).add(id))
  }

  return (
    <div className="tab-panel">
      <h2 className="retry-header">
        {list.length} business{list.length === 1 ? '' : 'es'} to retry
      </h2>
      <p className="lead-sub">Sorted by oldest call first — highest priority at top</p>

      <div className="filter-group">
        {MIN_CALLS.map(f => (
          <button
            key={f.min}
            className={`filter-btn${minCalls === f.min ? ' active' : ''}`}
            onClick={() => setMinCalls(f.min)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <input
        className="search-input"
        placeholder="Search by business name..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {searchQueries.length > 0 && (
        <select
          className="search-input"
          value={queryFilter}
          onChange={e => setQueryFilter(e.target.value)}
        >
          <option value="">All searches</option>
          {searchQueries.map(sq => (
            <option key={sq} value={sq}>
              {sq}
            </option>
          ))}
        </select>
      )}

      {list.length === 0 ? (
        <div className="empty-state">No unanswered calls — keep dialing.</div>
      ) : (
        <div className="lead-list">
          {list.map(lead => (
            <div key={lead.id} className={leaving.has(lead.id) ? 'row-leaving' : undefined}>
              <LeadRow
                lead={lead}
                trailing={`Last called: ${relativeTime(lead.lastCalled)}`}
                onStatusChange={markLeaving}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
