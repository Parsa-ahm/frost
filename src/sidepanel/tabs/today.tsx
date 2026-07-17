// Tab: Today
//
// LAYOUT (top to bottom):
//
// 1. SESSION STATS BAR — 4 chips in a row
//    [Dials: N]  [Qualified: N]  [No Answer: N]  [Rejected: N]
//    Source: today's DayStats from background GET_STATS
//    Updates live as background storage changes
//
// 2. FILTER TOGGLE ROW
//    Toggle switch: "Hide Called/Rejected"
//    When ON: filter the lead list below to show only status=pending and status=no_answer
//    When OFF: show all leads touched today (any status except hidden)
//    Default: ON (matches hideCalledOnMaps setting)
//
// 3. LEAD LIST — today's leads, sorted: pending first, no_answer second, rest below
//    Each row:
//      [Status dot color] [Business Name]              [Status badge text]
//                         [Address — muted]            [Call count: Nx]
//                         [Phone if present — muted]
//      On row click: expand inline detail with notes textarea + re-status buttons
//
//    Re-status buttons (inline, shown when row is expanded):
//      [No Answer] [Called] [Rejected] [Qualified] [Hide]
//      [Add to CRM] — shown only if status=qualified and !twentyId
//
//    "Today" = leads whose lastCalled date equals today's YYYY-MM-DD
//    If no leads today: show empty state "No calls yet today. Open Google Maps to start."
//
// 4. QUICK NOTES (per lead, expanded state)
//    Textarea with current lead.notes
//    Auto-saves on blur via UPDATE_STATUS with current status + new notes

export {}
