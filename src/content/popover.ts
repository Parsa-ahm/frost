// Quick action popover — appears when user clicks a badge.
//
// DESIGN: Dark floating card, positioned below/above the badge depending on viewport space.
//         Contains business name, address, 5 action buttons, optional notes textarea.
//
// LAYOUT:
//   [Business Name — truncated]
//   [Address — muted smaller text]
//   [Grid 2 cols]:
//     [No Answer 🟡] [Called 🔵]
//     [Rejected 🔴]  [Qualified 🟢]
//     [Hide ⬛ — full width col span 2]
//     [Add to CRM 🟣 — shown only if status === 'qualified' and !lead.twentyId, full width]
//   [Notes textarea — optional, placeholder "Add notes..."]
//
// BEHAVIOR:
//   showPopover(lead: IcyLead, anchorEl: Element, onAction: ActionCallback) → void
//     Removes any existing popover first.
//     Creates .frost-popover, positions it near anchorEl.
//     Clicking an action button: calls onAction(lead.id, outcome, notesValue), then removes popover.
//     Clicking outside the popover: removes popover.
//     Escape key: removes popover.
//
//   removePopover() → void
//     Removes any active .frost-popover from the DOM.
//
// POSITIONING:
//   Get anchorEl.getBoundingClientRect().
//   Default: popover top = rect.bottom + 8, left = rect.left.
//   If bottom overflows viewport: flip to rect.top - popover.offsetHeight - 8.
//   If right overflows viewport: align right edge to rect.right.
//   Set position: fixed on the popover.

export {}
