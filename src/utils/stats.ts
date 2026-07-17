// Stats aggregation helpers.
//
// IMPLEMENT:
//
// todayKey() → string
//   Returns today's date as YYYY-MM-DD using local time.
//
// aggregateWeek(allStats: DayStats[]) → DayStats
//   Sums dials/noAnswer/called/rejected/qualified for the last 7 days.
//   Returns a single DayStats with date = 'week'.
//
// aggregateAllTime(allStats: DayStats[]) → DayStats
//   Sums all records. Returns DayStats with date = 'all-time'.
//
// statsFromEvents(events: CallEvent[], date: string) → DayStats
//   Computes DayStats by filtering events for the given YYYY-MM-DD date.
//   Used to rebuild a day's stats if needed.

export {}
