// Twenty CRM API client.
// Self-hosted at settings.twentyApiUrl. Auth: Authorization: Bearer {twentyApiToken}
// Custom object "Icy Lead" (icyLead) must be pre-created in Twenty metadata —
// see Settings tab for the required field list.

import type { FrostSettings, IcyLead, LeadStatus, TwentyIcyLeadPayload } from '../types'

const STATUS_MAP: Record<LeadStatus, string> = {
  pending: 'NO_ANSWER',
  no_answer: 'NO_ANSWER',
  called: 'CALLED',
  rejected: 'REJECTED',
  qualified: 'QUALIFIED',
  hidden: 'NO_ANSWER',
}

interface TwentyCreateResponse {
  data?: { createIcyLead?: { id?: string } }
  id?: string
}

function baseUrl(settings: FrostSettings): string {
  return settings.twentyApiUrl.replace(/\/+$/, '')
}

function headers(settings: FrostSettings): Record<string, string> {
  return {
    Authorization: `Bearer ${settings.twentyApiToken}`,
    'Content-Type': 'application/json',
  }
}

async function errorBody(res: Response): Promise<string> {
  try {
    const text = await res.text()
    return text.slice(0, 300)
  } catch {
    return ''
  }
}

export function toPayload(lead: IcyLead): TwentyIcyLeadPayload {
  return {
    name: lead.name,
    phone: lead.phone,
    businessAddress: lead.address,
    status: STATUS_MAP[lead.status],
    callCount: lead.callCount,
    firstCalled: lead.firstCalled,
    lastCalled: lead.lastCalled,
    notes: lead.notes,
    searchQuery: lead.searchQuery,
  }
}

export async function pushIcyLead(lead: IcyLead, settings: FrostSettings): Promise<string> {
  const res = await fetch(`${baseUrl(settings)}/api/icyLeads`, {
    method: 'POST',
    headers: headers(settings),
    body: JSON.stringify(toPayload(lead)),
  })
  if (!res.ok) {
    throw new Error(`Twenty API ${res.status}: ${await errorBody(res)}`)
  }
  const body = (await res.json()) as TwentyCreateResponse
  // Twenty may reply GraphQL-style ({ data: { createIcyLead: { id } } }) or flat REST ({ id })
  const id = body.data?.createIcyLead?.id ?? body.id
  if (!id) throw new Error('Twenty API returned no record id')
  return id
}

export async function updateIcyLead(
  twentyId: string,
  patch: Partial<TwentyIcyLeadPayload>,
  settings: FrostSettings,
): Promise<void> {
  const res = await fetch(`${baseUrl(settings)}/api/icyLeads/${twentyId}`, {
    method: 'PATCH',
    headers: headers(settings),
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    throw new Error(`Twenty API ${res.status}: ${await errorBody(res)}`)
  }
}
