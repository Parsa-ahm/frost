// Shared side panel components — the expandable lead row used by Today and Retry.

import { useState } from 'react'
import type { CallEvent, IcyLead } from '../types'
import { getLead, upsertLead } from '../utils/storage'
import { errorMessage, isBgError, send, STATUS_LABEL } from './lib'

interface LeadRowProps {
  lead: IcyLead
  trailing?: string // right-aligned second line, e.g. "3 days ago"
  onStatusChange?: (leadId: string) => void
}

const RESTATUS: { outcome: CallEvent['outcome']; label: string }[] = [
  { outcome: 'no_answer', label: 'No Answer' },
  { outcome: 'called', label: 'Called' },
  { outcome: 'rejected', label: 'Rejected' },
  { outcome: 'qualified', label: 'Qualified' },
]

export function LeadRow({ lead, trailing, onStatusChange }: LeadRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const act = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (err: unknown) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const setStatus = (outcome: CallEvent['outcome']) =>
    act(async () => {
      const res = await send<IcyLead>({ type: 'UPDATE_STATUS', leadId: lead.id, outcome })
      if (isBgError(res)) throw new Error(res.error)
      onStatusChange?.(lead.id)
    })

  const hide = () =>
    act(async () => {
      const res = await send<IcyLead>({ type: 'HIDE_LEAD', leadId: lead.id })
      if (isBgError(res)) throw new Error(res.error)
      onStatusChange?.(lead.id)
    })

  const pushToCrm = () =>
    act(async () => {
      const res = await send<{ success?: boolean; error?: string }>({
        type: 'PUSH_TO_TWENTY',
        leadId: lead.id,
      })
      if (res.error) throw new Error(res.error)
    })

  // Notes save goes straight to storage — UPDATE_STATUS would count a dial
  const saveNotes = (notes: string) =>
    act(async () => {
      const current = await getLead(lead.id)
      if (current && current.notes !== notes) await upsertLead({ ...current, notes })
    })

  return (
    <div className={`lead-row${expanded ? ' expanded' : ''}`}>
      <button className="lead-row-main" onClick={() => setExpanded(v => !v)}>
        <span className="status-dot" data-status={lead.status} />
        <span className="lead-row-info">
          <span className="lead-name">{lead.name}</span>
          {lead.address && <span className="lead-sub">{lead.address}</span>}
          {lead.phone && <span className="lead-sub">{lead.phone}</span>}
        </span>
        <span className="lead-row-meta">
          <span className="status-badge" data-status={lead.status}>
            {STATUS_LABEL[lead.status]}
          </span>
          <span className="lead-sub">{trailing ?? `Called ${lead.callCount}x`}</span>
        </span>
      </button>

      {expanded && (
        <div className="lead-row-detail">
          <div className="restatus-buttons">
            {RESTATUS.map(({ outcome, label }) => (
              <button
                key={outcome}
                className="btn-status"
                data-status={outcome}
                disabled={busy}
                onClick={() => void setStatus(outcome)}
              >
                {label}
              </button>
            ))}
            <button className="btn-status" data-status="hidden" disabled={busy} onClick={() => void hide()}>
              Hide
            </button>
          </div>

          {lead.status === 'qualified' && !lead.twentyId && (
            <button className="btn-crm" disabled={busy} onClick={() => void pushToCrm()}>
              Add to CRM
            </button>
          )}
          {lead.twentyId && <div className="crm-synced">Synced to Twenty ✓</div>}

          <textarea
            className="notes-input"
            placeholder="Notes..."
            defaultValue={lead.notes}
            rows={2}
            onBlur={e => void saveNotes(e.target.value.trim())}
          />

          {trailing && <div className="lead-sub">Called {lead.callCount}x</div>}
          {error && <div className="error-text">{error}</div>}
        </div>
      )}
    </div>
  )
}
