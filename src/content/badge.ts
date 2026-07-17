// Badge injection — creates and updates the status dot on a Maps card.
//
// IMPLEMENT:
//
// injectBadge(card: Element, lead: IcyLead, onAction: ActionCallback) → void
//   1. If badge already exists on card, call updateBadge() instead and return.
//   2. Create a div.frost-badge with data-status={lead.status}
//   3. If lead.status === 'qualified' and lead.twentyId exists, set data-crm="true"
//   4. Append badge to card
//   5. badge.addEventListener('click', (e) => { e.stopPropagation(); showPopover(lead, badge, onAction) })
//
// updateBadge(card: Element, lead: IcyLead) → void
//   Finds the existing .frost-badge on the card.
//   Updates data-status and data-crm attributes.
//   If lead.status === 'hidden', sets card.style.display = 'none'.
//   If lead was hidden but status changed, restores card.style.display = ''.
//
// ActionCallback = (leadId: string, outcome: CallEvent['outcome'] | 'hidden', notes: string) => void

export {}
