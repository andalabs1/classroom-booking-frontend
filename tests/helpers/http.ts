import { AxiosError, AxiosHeaders, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach } from 'vitest'
import { adminAxiosClient, publicAxiosClient, userAxiosClient } from '../../src/shared/api/axiosClient'
import { useAdminAuth, useUserAuth } from '../../src/shared/stores/authStore'

export type CapturedRequest = {
  method: string | undefined
  url: string | undefined
  params: unknown
  body: unknown
  headers: AxiosHeaders
}

export function httpStub(client: AxiosInstance) {
  let reply: unknown
  let status = 200
  let failure: Error | undefined
  const requests: CapturedRequest[] = []
  const original = client.defaults.adapter

  beforeEach(() => {
    requests.length = 0
    reply = undefined
    status = 200
    failure = undefined
    client.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      requests.push({
        method: config.method,
        url: config.url,
        params: config.params,
        body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
        headers: config.headers,
      })
      if (failure) throw failure
      const response = { data: reply, status, statusText: String(status), headers: {}, config }
      if (status >= 400) throw new AxiosError('HTTP failure', 'ERR_BAD_RESPONSE', config, undefined, response)
      return response
    }
  })
  afterEach(() => { client.defaults.adapter = original })

  return {
    requests,
    reply(data: unknown, meta?: object) { reply = { success: true, data, ...(meta ? { meta } : {}) } },
    raw(data: unknown, responseStatus = 200) { reply = data; status = responseStatus },
    fail(error: Error) { failure = error },
    last() {
      const request = requests.at(-1)
      if (!request) throw new Error('Expected an HTTP request')
      return request
    },
  }
}

export const clients = { public: publicAxiosClient, user: userAxiosClient, admin: adminAxiosClient }
export function resetSessions() {
  useUserAuth.setState({ user: null, token: null })
  useAdminAuth.setState({ user: null, token: null })
}
