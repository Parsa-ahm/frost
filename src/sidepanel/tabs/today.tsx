// Tab: Today — session stats + leads touched today.

import { useState } from 'react'
import type { FrostSettings, IcyLead } from '../../types'
import { dateKey, todayKey } from '../../utils/stats'
import { LeadRow } from '../components'
import { STATUS_ORDER, type Stats } from '../lib'

interface TodayTabProps {
  leads: Record<string, IcyLead>
  stats: Stats
  settings: FrostSettings
}

export function TodayTab({ leads, stats, settings }: TodayTabProps) {
  const [hideDone, setHideDone] = useState(settings.hideCalledOnMaps)
  const today = todayKey()

  let list = Object.values(leads).filter(
    l => l.status !== 'hidden' && l.lastCalled && dateKey(new Date(l.lastCalled)) === today,
  )
  if (hideDone) {
    list = list.filter(l => l.status === 'pending' || l.status === 'no_answer')
  }
  list.sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name),
  )

  const t = stats.today

  return (
    <div className="tab-panel">
      <div className="chip-row">
        <div className="chip">
          <span className="chip-value">{t.dials}</span>
          <span className="chip-label">Dials</span>
        </div>
        <div className={`chip${t.qualified > 0 ? ' chip-green' : ''}`}>
          <span className="chip-value">{t.qualified}</span>
          <span className="chip-label">Qualified</span>
        </div>
        <div className="chip">
          <span className="chip-value">{t.noAnswer}</span>
          <span className="chip-label">No Answer</span>
        </div>
        <div className="chip">
          <span className="chip-value">{t.rejected}</span>
          <span className="chip-label">Rejected</span>
        </div>
      </div>

      <label className="toggle-row">
        <input type="checkbox" checked={hideDone} onChange={e => setHideDone(e.target.checked)} />
        <span>Hide Called/Rejected</span>
      </label>

      {list.length === 0 ? (
        <div className="empty-state">No calls yet today. Go to Google Maps and start dialing.</div>
      ) : (
        <div className="lead-list">
          {list.map(lead => (
            <LeadRow key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  )
}
