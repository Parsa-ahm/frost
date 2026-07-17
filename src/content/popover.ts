// Quick action popover — appears when user clicks a badge.

import type { IcyLead } from '../types'
import type { ActionCallback, BadgeAction } from './badge'

let activePopover: HTMLElement | null = null
let removeListeners: (() => void) | null = null

export function removePopover(): void {
  activePopover?.remove()
  activePopover = null
  removeListeners?.()
  removeListeners = null
}

interface ActionButton {
  action: BadgeAction
  label: string
  className: string
  fullWidth?: boolean
}

const BUTTONS: ActionButton[] = [
  { action: 'no_answer', label: 'No Answer', className: 'no-answer' },
  { action: 'called', label: 'Called', className: 'called' },
  { action: 'rejected', label: 'Rejected', className: 'rejected' },
  { action: 'qualified', label: 'Qualified', className: 'qualified' },
  { action: 'hidden', label: 'Hide', className: 'hide', fullWidth: true },
]

export function showPopover(lead: IcyLead, anchorEl: Element, onAction: ActionCallback): void {
  removePopover()

  const pop = document.createElement('div')
  pop.className = 'frost-popover'

  const name = document.createElement('div')
  name.className = 'frost-popover-name'
  name.textContent = lead.name
  pop.appendChild(name)

  const address = document.createElement('div')
  address.className = 'frost-popover-address'
  address.textContent = lead.address || lead.phone || lead.searchQuery
  pop.appendChild(address)

  const notes = document.createElement('textarea')
  notes.className = 'frost-popover-notes'
  notes.rows = 2
  notes.placeholder = 'Add notes...'

  const actions = document.createElement('div')
  actions.className = 'frost-popover-actions'

  const buttons: ActionButton[] = [...BUTTONS]
  if (lead.status === 'qualified' && !lead.twentyId) {
    buttons.push({ action: 'push_crm', label: 'Add to CRM', className: 'crm' })
  }

  for (const def of buttons) {
    const btn = document.createElement('button')
    btn.className = `frost-action-btn ${def.className}`
    btn.textContent = def.label
    if (def.fullWidth) btn.style.gridColumn = 'span 2'
    btn.addEventListener('click', e => {
      e.stopPropagation()
      onAction(lead.id, def.action, notes.value.trim())
      removePopover()
    })
    actions.appendChild(btn)
  }

  pop.appendChild(actions)
  pop.appendChild(notes)
  document.body.appendChild(pop)

  position(pop, anchorEl)

  const onPointerDown = (e: PointerEvent) => {
    if (e.target instanceof Node && !pop.contains(e.target)) removePopover()
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') removePopover()
  }
  document.addEventListener('pointerdown', onPointerDown, true)
  document.addEventListener('keydown', onKeyDown, true)

  activePopover = pop
  removeListeners = () => {
    document.removeEventListener('pointerdown', onPointerDown, true)
    document.removeEventListener('keydown', onKeyDown, true)
  }
}

function position(pop: HTMLElement, anchorEl: Element): void {
  const rect = anchorEl.getBoundingClientRect()
  let top = rect.bottom + 8
  let left = rect.left

  if (top + pop.offsetHeight > window.innerHeight) {
    top = rect.top - pop.offsetHeight - 8
  }
  if (left + pop.offsetWidth > window.innerWidth) {
    left = rect.right - pop.offsetWidth
  }

  pop.style.top = `${Math.max(8, top)}px`
  pop.style.left = `${Math.max(8, left)}px`
}
