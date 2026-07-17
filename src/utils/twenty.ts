// Twenty CRM API client.
// Self-hosted at settings.twentyApiUrl (e.g. https://crm.boldumbrella.com)
// Auth: Authorization: Bearer {settings.twentyApiToken}
//
// CUSTOM OBJECT: "Icy Lead"
//   Object name (singular camelCase): icyLead
//   REST endpoint: POST {twentyApiUrl}/api/icyLeads
//
// FIELDS on the icyLead object (must be pre-created in Twenty metadata):
//   name         Text        — business name (required, used as display name)
//   phone        Text
//   address      Text
//   status       Select      — options: NO_ANSWER, CALLED, REJECTED, QUALIFIED
//   callCount    Number
//   firstCalled  DateTime
//   lastCalled   DateTime
//   notes        RichText
//   searchQuery  Text
//
// IMPLEMENT:
//
// pushIcyLead(lead: IcyLead, settings: FrostSettings) → Promise<string>
//   POSTs to {twentyApiUrl}/api/icyLeads
//   Maps IcyLead fields to TwentyIcyLeadPayload
//   Returns the Twenty record ID on success
//   Throws on non-2xx response with the error body
//
// updateIcyLead(twentyId: string, patch: Partial<TwentyIcyLeadPayload>, settings: FrostSettings) → Promise<void>
//   PATCHes to {twentyApiUrl}/api/icyLeads/{twentyId}
//   Used to update status when a lead is re-contacted
//
// STATUS MAPPING:
//   no_answer  → 'NO_ANSWER'
//   called     → 'CALLED'
//   rejected   → 'REJECTED'
//   qualified  → 'QUALIFIED'

export {}
