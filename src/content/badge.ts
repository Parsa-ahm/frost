// Badge injection — creates and updates the status dot on a card / pane.

import type { CallEvent, IcyLead } from '../types'
import { showPopover } from './popover'

export type BadgeAction = CallEvent['outcome'] | 'hidden' | 'push_crm'
export type ActionCallback = (leadId: string, action: BadgeAction, notes: string) => void

// Latest lead per badge element — keeps popovers fresh after status changes
// without re-binding click listeners.
const badgeLeads = new WeakMap<Element, IcyLead>()

const STATUS_LABELS: Partial<Record<string, string>> = {
  no_answer: 'No Answer',
  called: 'Called',
  rejected: 'Rejected',
  qualified: 'Qualified',
}

function applyStatus(badge: HTMLElement, lead: IcyLead): void {
  badge.dataset.status = lead.status
  const crm = lead.status === 'qualified' && !!lead.twentyId
  if (crm) badge.dataset.crm = 'true'
  else delete badge.dataset.crm
  badge.textContent = crm ? 'Qualified ✓' : (STATUS_LABELS[lead.status] ?? '')
}

// `anchor` switches to inline placement (badge appended into the anchor, e.g.
// the place pane's h1) instead of the default absolute top-right position.
export function injectBadge(
  card: HTMLElement,
  lead: IcyLead,
  onAction: ActionCallback,
  anchor?: Element,
): void {
  if (card.querySelector('.frost-badge')) {
    updateBadge(card, lead)
    return
  }

  const badge = document.createElement('div')
  badge.className = anchor ? 'frost-badge frost-badge-inline' : 'frost-badge'
  badge.title = 'Frost — log this call'
  applyStatus(badge, lead)
  badgeLeads.set(badge, lead)

  badge.addEventListener('click', e => {
    e.stopPropagation()
    e.preventDefault()
    const current = badgeLeads.get(badge) ?? lead
    showPopover(current, badge, onAction)
  })

  if (anchor) {
    anchor.appendChild(badge)
  } else {
    card.style.position = 'relative'
    card.appendChild(badge)
  }

  if (lead.status === 'hidden' && !card.dataset.frostNoHide) card.style.display = 'none'
}

export function updateBadge(card: HTMLElement, lead: IcyLead): void {
  const badge = card.querySelector<HTMLElement>('.frost-badge')
  if (!badge) return
  badgeLeads.set(badge, lead)
  applyStatus(badge, lead)

  if (card.dataset.frostNoHide) return
  if (lead.status === 'hidden') card.style.display = 'none'
  else if (card.style.display === 'none') card.style.display = ''
}
