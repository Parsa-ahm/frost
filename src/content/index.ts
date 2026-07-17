// Content script entry — routes to the right surface handler.
//   google.com/maps/*   → results feed + place detail pane
//   google.com/search*  → local results ("Places" tab / local pack)
// Styles come from the manifest css entry (src/content/styles.css).

import { initCore } from './core'
import { initMaps } from './maps'
import { initSearch } from './search'

void (async () => {
  await initCore()
  if (location.pathname.startsWith('/maps')) initMaps()
  else initSearch()
})()
