// Tab: Settings — Twenty CRM config, behavior toggle, data management.

import { useState } from 'react'
import type { FrostSettings } from '../../types'
import { todayKey } from '../../utils/stats'
import { clearDayStat, exportAllData, resetAllData } from '../../utils/storage'
import { errorMessage, send } from '../lib'

interface SettingsTabProps {
  settings: FrostSettings
  onSaved: () => void
}

export function SettingsTab({ settings, onSaved }: SettingsTabProps) {
  const [apiUrl, setApiUrl] = useState(settings.twentyApiUrl)
  const [apiToken, setApiToken] = useState(settings.twentyApiToken)
  const [hideCalled, setHideCalled] = useState(settings.hideCalledOnMaps)
  const [saveMsg, setSaveMsg] = useState('')
  const [testMsg, setTestMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [dataMsg, setDataMsg] = useState('')
  const [showSetup, setShowSetup] = useState(false)

  const persist = async (next: FrostSettings) => {
    await send({ type: 'SAVE_SETTINGS', settings: next })
    onSaved()
  }

  const save = async () => {
    setSaveMsg('')
    try {
      await persist({
        twentyApiUrl: apiUrl.trim().replace(/\/+$/, ''),
        twentyApiToken: apiToken.trim(),
        hideCalledOnMaps: hideCalled,
      })
      setSaveMsg('Saved!')
      setTimeout(() => setSaveMsg(''), 2000)
    } catch (err: unknown) {
      setSaveMsg(errorMessage(err))
    }
  }

  const testConnection = async () => {
    setTestMsg(null)
    const url = apiUrl.trim().replace(/\/+$/, '')
    if (!url) {
      setTestMsg({ text: 'Enter an API URL first', ok: false })
      return
    }
    try {
      // Any HTTP response (even 401/404) proves the server is reachable
      await fetch(`${url}/api/icyLeads?limit=1`, {
        headers: { Authorization: `Bearer ${apiToken.trim()}` },
      })
      setTestMsg({ text: 'Connected ✓', ok: true })
    } catch (err: unknown) {
      setTestMsg({ text: `Failed: ${errorMessage(err)}`, ok: false })
    }
  }

  const toggleHide = async (value: boolean) => {
    setHideCalled(value)
    await persist({
      twentyApiUrl: settings.twentyApiUrl,
      twentyApiToken: settings.twentyApiToken,
      hideCalledOnMaps: value,
    })
  }

  const exportJson = async () => {
    const data = await exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `frost-export-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearToday = async () => {
    if (!window.confirm("Clear today's stats? Leads and call history stay intact.")) return
    await clearDayStat(todayKey())
    setDataMsg("Today's stats cleared.")
    onSaved()
  }

  const resetAll = async () => {
    const typed = window.prompt('This deletes ALL leads, events, and stats. Type RESET to confirm:')
    if (typed !== 'RESET') return
    await resetAllData()
    setDataMsg('All data cleared.')
    onSaved()
  }

  return (
    <div className="tab-panel">
      <h3 className="section-title">Twenty CRM Integration</h3>
      <label className="field-label">API URL</label>
      <input
        className="search-input"
        type="url"
        placeholder="https://crm.boldumbrella.com"
        value={apiUrl}
        onChange={e => setApiUrl(e.target.value)}
      />
      <label className="field-label">API Token</label>
      <input
        className="search-input"
        type="password"
        placeholder="Bearer token from Twenty Settings"
        value={apiToken}
        onChange={e => setApiToken(e.target.value)}
      />
      <div className="btn-row">
        <button className="btn-primary" onClick={() => void save()}>
          Save
        </button>
        <button className="btn-ghost" onClick={() => void testConnection()}>
          Test Connection
        </button>
        {saveMsg && <span className="save-msg">{saveMsg}</span>}
        {testMsg && (
          <span className={testMsg.ok ? 'save-msg' : 'error-text'}>{testMsg.text}</span>
        )}
      </div>

      <button className="btn-ghost setup-toggle" onClick={() => setShowSetup(v => !v)}>
        {showSetup ? '−' : '+'} Setup instructions
      </button>
      {showSetup && (
        <p className="setup-note">
          Create an “Icy Lead” custom object in Twenty before using. Required fields: name (Text),
          phone (Text), address (Text), status (Select: NO_ANSWER/CALLED/REJECTED/QUALIFIED),
          callCount (Number), firstCalled (DateTime), lastCalled (DateTime), notes (RichText),
          searchQuery (Text)
        </p>
      )}

      <h3 className="section-title">Behavior</h3>
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={hideCalled}
          onChange={e => void toggleHide(e.target.checked)}
        />
        <span>Auto-hide called/rejected cards on Google Maps</span>
      </label>

      <h3 className="section-title">Data</h3>
      <div className="btn-col">
        <button className="btn-ghost" onClick={() => void exportJson()}>
          Export JSON
        </button>
        <button className="btn-ghost" onClick={() => void clearToday()}>
          Clear Today's Stats
        </button>
        <button className="btn-danger" onClick={() => void resetAll()}>
          Reset All Data
        </button>
        {dataMsg && <span className="save-msg">{dataMsg}</span>}
      </div>
    </div>
  )
}
