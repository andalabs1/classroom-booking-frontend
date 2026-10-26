import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'

// Runs hooks without adding a DOM dependency. Observer refetch/mutation methods
// remain usable; this does not simulate browser mounting or user interactions.
export function renderQueryHook<T>(client: QueryClient, useHook: () => T): T {
  const results: T[] = []
  function Probe() {
    results.push(useHook())
    return null
  }
  renderToString(createElement(QueryClientProvider, { client }, createElement(Probe)))
  if (!results.length) throw new Error('Hook probe did not render')
  return results[0]!
}
