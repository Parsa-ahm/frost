// Tab: Cold Calling Stats
//
// LAYOUT:
//
// 1. SUMMARY CARDS ROW — 3 cards
//    [All-Time Dials]  [All-Time Qualified]  [Qualified Rate: N%]
//    Qualified rate = qualified / dials * 100, rounded to 1 decimal
//
// 2. THIS WEEK ROW — same 3 cards but for last 7 days
//
// 3. DAILY BREAKDOWN TABLE
//    Columns: Date | Dials | Qualified | No Answer | Called | Rejected
//    Rows: one per day that has any calls, sorted newest first
//    Last row: TOTAL (sum of all rows shown)
//    Show last 30 days by default, [Load more] button for older
//
// 4. BEST DAY callout
//    "Best day: [date] — [N] dials"
//    Computed from allDayStats, find max dials
//
// DATA:
//   Comes from GET_STATS reply: { today, allTime, allDays }
//   Render is purely computed — no additional fetching needed

export {}
