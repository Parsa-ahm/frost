// Shared side panel helpers — messaging, formatting, status metadata.

import type { BgMessage, DayStats, LeadStatus } from '../types'

export interface Stats {
  today: DayStats
  allTime: DayStats
  allDays: DayStats[]
}

export function send<T>(msg: BgMessage): Promise<T> {
  return chrome.runtime.sendMessage(msg) as Promise<T>
}

export function isBgError(res: unknown): res is { error: string } {
  return typeof res === 'object' && res !== null && 'error' in res
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unexpected error'
}

export const STATUS_LABEL: Record<LeadStatus, string> = {
  pending: 'Pending',
  no_answer: 'No Answer',
  called: 'Called',
  rejected: 'Rejected',
  qualified: 'Qualified',
  hidden: 'Hidden',
}

// Sort order for lead lists: work-in-progress first, done last
export const STATUS_ORDER: Record<LeadStatus, number> = {
  pending: 0,
  no_answer: 1,
  called: 2,
  rejected: 3,
  qualified: 4,
  hidden: 5,
}

const DAY_MS = 86_400_000

export function relativeTime(iso: string): string {
  if (!iso) return 'never'
  const then = new Date(iso)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const days = Math.floor((startOfToday.getTime() - then.getTime()) / DAY_MS) + 1

  if (then >= startOfToday) return 'today'
  if (days <= 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
  const months = Math.floor(days / 30)
  return months <= 1 ? '1 month ago' : `${months} months ago`
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function fmtDateLong(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  if (!y || !m || !d) return dateKey
  return new Date(y, m - 1, d).toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function fmtDateShort(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  if (!y || !m || !d) return dateKey
  return new Date(y, m - 1, d).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
