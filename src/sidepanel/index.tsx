// Side panel root — React 18 entry point.

import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { CallEvent, FrostSettings, IcyLead } from '../types'
import { getEvents, getSettings } from '../utils/storage'
import { send, type Stats } from './lib'
import { TodayTab } from './tabs/today'
import { LogTab } from './tabs/log'
import { RetryTab } from './tabs/retry'
import { StatsTab } from './tabs/stats'
import { SettingsTab } from './tabs/settings'

type Tab = 'today' | 'log' | 'retry' | 'stats' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'log', label: 'Log' },
  { id: 'retry', label: 'Retry' },
  { id: 'stats', label: 'Stats' },
  { id: 'settings', label: 'Settings' },
]

interface AppData {
  leads: Record<string, IcyLead>
  events: CallEvent[]
  stats: Stats
  settings: FrostSettings
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('today')
  const [data, setData] = useState<AppData | null>(null)
  const timerRef = useRef<number>()

  const refresh = useCallback(async () => {
    const [leads, stats, events, settings] = await Promise.all([
      send<Record<string, IcyLead>>({ type: 'GET_LEADS' }),
      send<Stats>({ type: 'GET_STATS' }),
      getEvents(),
      getSettings(),
    ])
    setData({ leads, stats, events, settings })
  }, [])

  useEffect(() => {
    void refresh()
    // debounce bursts of storage writes from the content script
    const onChanged = () => {
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => void refresh(), 300)
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => {
      chrome.storage.onChanged.removeListener(onChanged)
      window.clearTimeout(timerRef.current)
    }
  }, [refresh])

  return (
    <div className="app">
      <header className="header">
        <span className="logo">
          <svg width="20" height="20" viewBox="0 0 262 262" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="262" height="262" fill="#101115" rx="52"/>
            <path d="M86 176H116V206H86L56 176V146H86V176ZM206 176L176 206H146V176H176V146H206V176ZM143.154 118.846L176 131L143.154 143.154L131 176L118.846 143.154L86 131L118.846 118.846L131 86L143.154 118.846ZM116 86H86V116H56V86L86 56H116V86ZM206 86V116H176V86H146V56H176L206 86Z" fill="url(#sp0)"/>
            <defs>
              <linearGradient id="sp0" x1="131" y1="56" x2="131" y2="206" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3399FF"/>
                <stop offset="1" stopColor="#1C4F9C"/>
              </linearGradient>
            </defs>
          </svg>
          Frost
        </span>
        <button
          className="gear-btn"
          title="Settings"
          onClick={() => setActiveTab('settings')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </header>

      <nav className="tab-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {!data ? (
          <div className="empty-state">Loading…</div>
        ) : activeTab === 'today' ? (
          <TodayTab leads={data.leads} stats={data.stats} settings={data.settings} />
        ) : activeTab === 'log' ? (
          <LogTab leads={data.leads} events={data.events} />
        ) : activeTab === 'retry' ? (
          <RetryTab leads={data.leads} />
        ) : activeTab === 'stats' ? (
          <StatsTab stats={data.stats} />
        ) : (
          <SettingsTab settings={data.settings} onSaved={() => void refresh()} />
        )}
      </main>
    </div>
  )
}

const rootEl = document.getElementById('root')
if (rootEl) createRoot(rootEl).render(<App />)
