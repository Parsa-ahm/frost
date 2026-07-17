// ─── Lead Status ──────────────────────────────────────────────────────────────

export type LeadStatus =
  | 'pending'    // not yet called
  | 'no_answer'  // rang, no pickup
  | 'called'     // spoke to someone, not qualified
  | 'rejected'   // hard no
  | 'qualified'  // interested — pushed to Twenty CRM
  | 'hidden'     // manually removed from view

// ─── Core Data ────────────────────────────────────────────────────────────────

export interface IcyLead {
  id: string           // stable hash of (name + address)
  name: string
  phone: string        // from Maps card if visible, else empty string
  address: string
  mapsUrl: string      // full Google Maps URL for this business
  status: LeadStatus
  callCount: number    // increments on every dial attempt (any outcome)
  firstCalled: string  // ISO datetime of first call
  lastCalled: string   // ISO datetime of most recent call
  notes: string
  searchQuery: string  // the Maps search that surfaced this lead e.g. "plumbers toronto"
  twentyId?: string    // set after record is pushed to Twenty CRM
  addedAt: string      // ISO datetime when first seen in Maps results
}

export interface CallEvent {
  id: string           // crypto.randomUUID()
  leadId: string
  timestamp: string    // ISO datetime
  outcome: Exclude<LeadStatus, 'pending' | 'hidden'>
  notes: string
}

export interface DayStats {
  date: string         // YYYY-MM-DD
  dials: number        // total call attempts (no_answer + called + rejected + qualified)
  noAnswer: number
  called: number
  rejected: number
  qualified: number
}

// ─── Storage Schema ───────────────────────────────────────────────────────────
// All data lives in chrome.storage.local under these exact keys.

export interface StorageSchema {
  leads: Record<string, IcyLead>       // keyed by IcyLead.id
  events: CallEvent[]                  // append-only log, all time
  dayStats: Record<string, DayStats>   // keyed by YYYY-MM-DD
  settings: FrostSettings
}

export interface FrostSettings {
  twentyApiUrl: string     // e.g. https://crm.boldumbrella.com
  twentyApiToken: string   // Bearer token from Twenty settings
  hideCalledOnMaps: boolean  // auto-hide called/rejected cards on Maps
}

// ─── Messages (content ↔ background) ─────────────────────────────────────────

export type BgMessage =
  | { type: 'UPDATE_STATUS'; leadId: string; outcome: CallEvent['outcome']; notes?: string }
  | { type: 'HIDE_LEAD'; leadId: string }
  | { type: 'GET_LEADS' }
  | { type: 'GET_STATS' }
  | { type: 'PUSH_TO_TWENTY'; leadId: string }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; settings: FrostSettings }
  | { type: 'UPSERT_LEAD'; lead: Pick<IcyLead, 'name' | 'phone' | 'address' | 'mapsUrl' | 'searchQuery'> }

// ─── Twenty CRM ───────────────────────────────────────────────────────────────

export interface TwentyIcyLeadPayload {
  name: string
  phone: string
  businessAddress: string
  status: string
  callCount: number
  firstCalled: string
  lastCalled: string
  notes: string
  searchQuery: string
}
