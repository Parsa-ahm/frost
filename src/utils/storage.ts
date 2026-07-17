// chrome.storage.local helpers.
// All reads/writes go through these functions — never access chrome.storage directly elsewhere.
//
// Schema (StorageSchema from types/index.ts):
//   leads      → Record<string, IcyLead>   keyed by lead.id
//   events     → CallEvent[]               append-only
//   dayStats   → Record<string, DayStats>  keyed by YYYY-MM-DD
//   settings   → FrostSettings
//
// IMPLEMENT:
//   getLeads()                    → Promise<Record<string, IcyLead>>
//   getLead(id)                   → Promise<IcyLead | null>
//   upsertLead(lead: IcyLead)     → Promise<void>
//   getEvents()                   → Promise<CallEvent[]>
//   appendEvent(e: CallEvent)     → Promise<void>
//   getDayStats(date: string)     → Promise<DayStats>   date = YYYY-MM-DD
//   getAllDayStats()               → Promise<DayStats[]> sorted newest first
//   incrementDayStat(date, field) → Promise<void>       field = keyof DayStats excluding 'date'
//   getSettings()                 → Promise<FrostSettings>
//   saveSettings(s: FrostSettings)→ Promise<void>
//
// DEFAULT SETTINGS:
//   { twentyApiUrl: '', twentyApiToken: '', hideCalledOnMaps: true }

export {}
