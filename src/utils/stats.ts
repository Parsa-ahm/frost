// Stats aggregation helpers.

import type { CallEvent, DayStats } from '../types'

// CallEvent.outcome → DayStats counter field
export const OUTCOME_FIELD: Record<CallEvent['outcome'], 'noAnswer' | 'called' | 'rejected' | 'qualified'> = {
  no_answer: 'noAnswer',
  called: 'called',
  rejected: 'rejected',
  qualified: 'qualified',
}

export function emptyDayStats(date: string): DayStats {
  return { date, dials: 0, noAnswer: 0, called: 0, rejected: 0, qualified: 0 }
}

export function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayKey(): string {
  return dateKey(new Date())
}

function sumStats(stats: DayStats[], date: string): DayStats {
  return stats.reduce<DayStats>(
    (acc, s) => ({
      date,
      dials: acc.dials + s.dials,
      noAnswer: acc.noAnswer + s.noAnswer,
      called: acc.called + s.called,
      rejected: acc.rejected + s.rejected,
      qualified: acc.qualified + s.qualified,
    }),
    emptyDayStats(date),
  )
}

export function aggregateWeek(allStats: DayStats[]): DayStats {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 6)
  const cutoffKey = dateKey(cutoff)
  return sumStats(allStats.filter(s => s.date >= cutoffKey), 'week')
}

export function aggregateAllTime(allStats: DayStats[]): DayStats {
  return sumStats(allStats, 'all-time')
}

export function statsFromEvents(events: CallEvent[], date: string): DayStats {
  const dayEvents = events.filter(e => dateKey(new Date(e.timestamp)) === date)
  return dayEvents.reduce<DayStats>((acc, e) => {
    const field = OUTCOME_FIELD[e.outcome]
    return { ...acc, dials: acc.dials + 1, [field]: acc[field] + 1 }
  }, emptyDayStats(date))
}
