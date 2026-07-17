// Side panel root — React 18 entry point.
// Renders <App /> into #root.
// App manages active tab state and passes chrome.storage data down.
//
// TABS: 'today' | 'log' | 'retry' | 'stats' | 'settings'
//
// DATA LOADING:
//   On mount: send GET_LEADS and GET_STATS to background, store in state.
//   Subscribe to chrome.storage.onChanged to re-fetch when data changes
//   (this keeps side panel live while content script updates storage).
//
// IMPLEMENT App component:
//   State: { activeTab, leads, events, stats, settings, loading }
//   Render: <Header /> + <TabBar /> + <TabContent />
//
// See tabs/ directory for each tab's full spec.

export {}
