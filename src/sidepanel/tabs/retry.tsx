// Tab: Retry — all no_answer leads across all time, ready to work through
//
// PURPOSE: The "Friday list". Shows everyone who never picked up so you can retry them.
//
// LAYOUT:
//
// 1. HEADER
//    "N people to retry"
//    Subtext: "Sorted by oldest call first — highest priority at top"
//
// 2. FILTER ROW
//    [Called more than: 1x / 2x / 3x] — filter by minimum call count
//    [Search: by business name]
//    [Search query filter: dropdown of all unique searchQuery values]
//      e.g. "plumbers toronto", "electricians mississauga" etc.
//      Useful for retrying a specific niche/area
//
// 3. LEAD LIST — status=no_answer only, sorted by lastCalled ASC (oldest = top)
//    Each row:
//      [Yellow dot] [Business Name]               [Last called: "3 days ago"]
//                   [Address]                     [Called Nx]
//                   [Phone if present]
//      Expand on click → same re-status buttons as Today tab
//        [No Answer] [Called] [Rejected] [Qualified]
//        After marking: row animates out of list (status is no longer no_answer)
//
// 4. EMPTY STATE
//    "No unanswered calls. Keep dialing!"
//
// RELATIVE TIME HELPER:
//   "X days ago", "today", "yesterday" — computed from lastCalled vs now

export {}
