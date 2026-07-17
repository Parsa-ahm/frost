// Tab: Cold Calling Stats — all-time / weekly summaries + daily breakdown table.

import { useState } from 'react'
import type { DayStats } from '../../types'
import { aggregateWeek } from '../../utils/stats'
import { fmtDateShort, type Stats } from '../lib'

interface StatsTabProps {
  stats: Stats
}

function rate(s: DayStats): string {
  if (s.dials === 0) return '0%'
  return `${((s.qualified / s.dials) * 100).toFixed(1)}%`
}

function SummaryCards({ title, data }: { title: string; data: DayStats }) {
  return (
    <>
      <h3 className="section-title">{title}</h3>
      <div className="chip-row">
        <div className="chip">
          <span className="chip-value">{data.dials}</span>
          <span className="chip-label">Dials</span>
        </div>
        <div className={`chip${data.qualified > 0 ? ' chip-green' : ''}`}>
          <span className="chip-value">{data.qualified}</span>
          <span className="chip-label">Qualified</span>
        </div>
        <div className="chip">
          <span className="chip-value">{rate(data)}</span>
          <span className="chip-label">Rate</span>
        </div>
      </div>
    </>
  )
}

export function StatsTab({ stats }: StatsTabProps) {
  const [shown, setShown] = useState(30)

  const week = aggregateWeek(stats.allDays)
  const daysWithCalls = stats.allDays.filter(d => d.dials > 0)
  const visible = daysWithCalls.slice(0, shown)

  const bestDay = daysWithCalls.reduce<DayStats | null>(
    (best, d) => (best === null || d.dials > best.dials ? d : best),
    null,
  )

  const total = visible.reduce(
    (acc, d) => ({
      dials: acc.dials + d.dials,
      qualified: acc.qualified + d.qualified,
      noAnswer: acc.noAnswer + d.noAnswer,
      called: acc.called + d.called,
      rejected: acc.rejected + d.rejected,
    }),
    { dials: 0, qualified: 0, noAnswer: 0, called: 0, rejected: 0 },
  )

  return (
    <div className="tab-panel">
      <SummaryCards title="All Time" data={stats.allTime} />
      <SummaryCards title="This Week" data={week} />

      {bestDay && (
        <div className="best-day">
          Best day: {fmtDateShort(bestDay.date)} — {bestDay.dials} dials
        </div>
      )}

      {visible.length === 0 ? (
        <div className="empty-state">No calls logged yet.</div>
      ) : (
        <>
          <table className="stats-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Dials</th>
                <th>Qual.</th>
                <th>No Ans</th>
                <th>Called</th>
                <th>Rej.</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(d => (
                <tr key={d.date}>
                  <td>{fmtDateShort(d.date)}</td>
                  <td>{d.dials}</td>
                  <td>{d.qualified}</td>
                  <td>{d.noAnswer}</td>
                  <td>{d.called}</td>
                  <td>{d.rejected}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td>TOTAL</td>
                <td>{total.dials}</td>
                <td>{total.qualified}</td>
                <td>{total.noAnswer}</td>
                <td>{total.called}</td>
                <td>{total.rejected}</td>
              </tr>
            </tbody>
          </table>
          {daysWithCalls.length > shown && (
            <button className="btn-ghost" onClick={() => setShown(n => n + 30)}>
              Load more
            </button>
          )}
        </>
      )}
    </div>
  )
}
