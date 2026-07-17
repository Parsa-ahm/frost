// chrome.storage.local helpers.
// All reads/writes go through these functions — never access chrome.storage directly elsewhere.

import type { CallEvent, DayStats, FrostSettings, IcyLead } from '../types'
import { emptyDayStats } from './stats'

const DEFAULT_SETTINGS: FrostSettings = {
  twentyApiUrl: '',
  twentyApiToken: '',
  hideCalledOnMaps: true,
}

async function get<T>(key: string, fallback: T): Promise<T> {
  const result = await chrome.storage.local.get(key)
  return (result[key] as T | undefined) ?? fallback
}

export async function getLeads(): Promise<Record<string, IcyLead>> {
  return get<Record<string, IcyLead>>('leads', {})
}

export async function getLead(id: string): Promise<IcyLead | null> {
  const leads = await getLeads()
  return leads[id] ?? null
}

export async function upsertLead(lead: IcyLead): Promise<void> {
  const leads = await getLeads()
  await chrome.storage.local.set({ leads: { ...leads, [lead.id]: lead } })
}

export async function getEvents(): Promise<CallEvent[]> {
  return get<CallEvent[]>('events', [])
}

export async function appendEvent(e: CallEvent): Promise<void> {
  const events = await getEvents()
  await chrome.storage.local.set({ events: [...events, e] })
}

export async function getDayStats(date: string): Promise<DayStats> {
  const all = await get<Record<string, DayStats>>('dayStats', {})
  return all[date] ?? emptyDayStats(date)
}

export async function getAllDayStats(): Promise<DayStats[]> {
  const all = await get<Record<string, DayStats>>('dayStats', {})
  return Object.values(all).sort((a, b) => b.date.localeCompare(a.date))
}

export async function incrementDayStat(
  date: string,
  fields: Partial<Omit<DayStats, 'date'>>,
): Promise<void> {
  const all = await get<Record<string, DayStats>>('dayStats', {})
  const current = all[date] ?? emptyDayStats(date)
  const updated: DayStats = {
    date,
    dials: current.dials + (fields.dials ?? 0),
    noAnswer: current.noAnswer + (fields.noAnswer ?? 0),
    called: current.called + (fields.called ?? 0),
    rejected: current.rejected + (fields.rejected ?? 0),
    qualified: current.qualified + (fields.qualified ?? 0),
  }
  await chrome.storage.local.set({ dayStats: { ...all, [date]: updated } })
}

export async function getSettings(): Promise<FrostSettings> {
  return get<FrostSettings>('settings', DEFAULT_SETTINGS)
}

export async function saveSettings(s: FrostSettings): Promise<void> {
  await chrome.storage.local.set({ settings: s })
}

// ─── Data management (Settings tab) ──────────────────────────────────────────

export async function clearDayStat(date: string): Promise<void> {
  const all = await get<Record<string, DayStats>>('dayStats', {})
  const { [date]: _removed, ...rest } = all
  await chrome.storage.local.set({ dayStats: rest })
}

export async function resetAllData(): Promise<void> {
  await chrome.storage.local.set({ leads: {}, events: [], dayStats: {} })
}

export async function exportAllData(): Promise<{
  leads: Record<string, IcyLead>
  events: CallEvent[]
  dayStats: DayStats[]
}> {
  const [leads, events, dayStats] = await Promise.all([getLeads(), getEvents(), getAllDayStats()])
  return { leads, events, dayStats }
}
