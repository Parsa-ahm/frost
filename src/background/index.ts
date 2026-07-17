// Background service worker — single source of truth for all data operations.
// Content script and side panel both send messages here; never write storage directly.
//
// ON INSTALL:
//   chrome.runtime.onInstalled → set default settings if none exist
//   chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
//
// MESSAGE HANDLERS (chrome.runtime.onMessage):
//
// UPSERT_LEAD { lead: Pick<IcyLead, 'name'|'phone'|'address'|'mapsUrl'|'searchQuery'> }
//   1. Compute id = await leadId(lead.name, lead.address)
//   2. Check if lead already exists in storage
//   3. If new: create IcyLead with status='pending', callCount=0, addedAt=now
//   4. If exists: update phone/mapsUrl if they were empty and now have values
//   5. Upsert to storage, reply with full IcyLead
//
// UPDATE_STATUS { leadId, outcome, notes? }
//   1. Load lead from storage
//   2. Create CallEvent { id: uuid, leadId, timestamp: now, outcome, notes: notes??'' }
//   3. Append event to storage
//   4. Update lead: status=outcome, callCount++, lastCalled=now, firstCalled if never called
//   5. If notes provided, append to lead.notes (newline-separated)
//   6. Increment today's DayStats: dials++ and outcome field++
//   7. Save lead to storage
//   8. Reply with updated IcyLead
//
// HIDE_LEAD { leadId }
//   Load lead, set status='hidden', save. Reply with updated lead.
//   Do NOT increment call stats — hiding is not a dial.
//
// GET_LEADS
//   Return all leads as Record<string, IcyLead>
//
// GET_STATS
//   Return { today: DayStats, allTime: DayStats, allDays: DayStats[] }
//   allDays sorted newest-first
//
// PUSH_TO_TWENTY { leadId }
//   1. Load lead and settings
//   2. If no API token configured, reply { error: 'No API token' }
//   3. Call twenty.pushIcyLead(lead, settings)
//   4. On success: set lead.twentyId = returned ID, save lead, reply { success: true, twentyId }
//   5. On error: reply { error: message }
//
// GET_SETTINGS
//   Return FrostSettings from storage
//
// SAVE_SETTINGS { settings }
//   Save FrostSettings to storage, reply { success: true }

export {}
