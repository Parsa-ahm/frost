// Tab: Log — full call history, every event ever
//
// LAYOUT:
//
// 1. FILTER ROW
//    [Date range picker: Today / This Week / This Month / All Time]
//    [Status filter: All / No Answer / Called / Rejected / Qualified]
//    [Search input: filter by business name]
//
// 2. EVENT LIST — sorted newest first
//    Each row:
//      [Timestamp: "Mon Jul 14 · 2:34pm"]  [Outcome badge]
//      [Business Name]
//      [Notes — shown if non-empty, muted, truncated]
//
//    Grouping: events are grouped by date (YYYY-MM-DD), with a sticky date header
//      e.g. "Wednesday, July 14 — 8 calls"
//
// 3. PER-LEAD DRILL DOWN
//    Clicking a row shows all events for that lead in a modal/sheet:
//      Lead name, address, phone
//      Full call history: each event with timestamp, outcome, notes
//      Current status, total call count
//      [Open in Maps] button using lead.mapsUrl
//
// DATA:
//   Load all CallEvent[] from storage, join with IcyLead data for names
//   Apply filters client-side

export {}
