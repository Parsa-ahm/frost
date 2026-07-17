// Tab: Settings
//
// LAYOUT:
//
// 1. TWENTY CRM SECTION
//    Label: "Twenty CRM Integration"
//    Field: API URL        — input type=url, placeholder "https://crm.boldumbrella.com"
//    Field: API Token      — input type=password, placeholder "Bearer token from Twenty Settings"
//    [Save] button → sends SAVE_SETTINGS to background, shows "Saved!" confirmation
//    [Test connection] button → sends a GET to {apiUrl}/api/icyLeads?limit=1
//      Shows "Connected ✓" or "Failed: {error}"
//
//    Setup note (small muted text):
//      "Create an 'Icy Lead' custom object in Twenty before using.
//       Required fields: name, phone, address, status (Select), callCount (Number),
//       firstCalled (DateTime), lastCalled (DateTime), notes (RichText), searchQuery (Text)"
//
// 2. BEHAVIOR SECTION
//    Toggle: "Auto-hide called/rejected cards on Google Maps"
//    Default: ON
//    Saved to settings.hideCalledOnMaps
//
// 3. DATA SECTION
//    Label: "Data"
//    [Export JSON] button → downloads all leads + events as frost-export-{date}.json
//    [Clear today's stats] button → resets today's DayStats (with confirm dialog)
//    [Reset all data] button — destructive, requires typing "RESET" to confirm
//      Clears leads, events, dayStats from storage. Does NOT clear settings.

export {}
