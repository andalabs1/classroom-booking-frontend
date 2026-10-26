import axios from 'axios'
import { beforeEach } from 'vitest'

// Only installed by Vitest; never imported by the application.
const values = new Map<string, string>()
const storage: Storage = {
  get length() { return values.size },
  clear: () => values.clear(),
  getItem: (key) => values.get(key) ?? null,
  key: (index) => [...values.keys()][index] ?? null,
  removeItem: (key) => { values.delete(key) },
  setItem: (key, value) => { values.set(key, value) },
}
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { localStorage: storage, location: { origin: 'http://localhost' } },
})

// A missing stub must fail immediately, never reach a real backend.
axios.defaults.adapter = async (config) => {
  throw new Error(`Unstubbed HTTP request: ${config.method} ${config.url}`)
}
beforeEach(() => storage.clear())
