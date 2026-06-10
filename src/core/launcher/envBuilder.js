// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2026 jackybig <jacky_big@outlook.com>
/**
 * Build environment variables with proxy settings injected.
 * @param {{protocol:string,host:string,port:number}} proxy
 * @param {object} [existingEnv=process.env]
 * @param {{override?:boolean}} [options={}]
 * @returns {object} New environment object
 */
export function buildProxyEnv(proxy, existingEnv = process.env, options = {}) {
  const { override = true } = options
  if (!proxy) return { ...existingEnv }

  const proxyUrl = `${proxy.protocol}://${proxy.host}:${proxy.port}`

  const newEnv = { ...existingEnv }

  // Strip existing proxy vars if override is true
  if (override) {
    const proxyKeys = [
      'HTTP_PROXY', 'http_proxy',
      'HTTPS_PROXY', 'https_proxy',
      'ALL_PROXY', 'all_proxy',
      'FTP_PROXY', 'ftp_proxy',
      'NO_PROXY', 'no_proxy'
    ]
    for (const key of proxyKeys) {
      delete newEnv[key]
    }
  }

  // Set HTTP/HTTPS proxy
  const httpProxyUrl = `http://${proxy.host}:${proxy.port}`
  newEnv.HTTP_PROXY = httpProxyUrl
  newEnv.HTTPS_PROXY = httpProxyUrl

  // Set ALL_PROXY based on protocol
  if (proxy.protocol === 'socks5' || proxy.protocol === 'socks5h') {
    newEnv.ALL_PROXY = `socks5://${proxy.host}:${proxy.port}`
    // Some tools prefer lowercase
    newEnv.all_proxy = `socks5://${proxy.host}:${proxy.port}`
  } else {
    newEnv.ALL_PROXY = proxyUrl
    newEnv.all_proxy = proxyUrl
  }

  // Keep NO_PROXY for local addresses
  if (!newEnv.NO_PROXY) {
    newEnv.NO_PROXY = 'localhost,127.0.0.1,::1'
    newEnv.no_proxy = 'localhost,127.0.0.1,::1'
  }

  return newEnv
}

/**
 * Strip all proxy-related environment variables from an env object.
 * @param {object} env
 * @returns {object} Clean env object
 */
export function stripProxyEnv(env) {
  const proxyKeys = [
    'HTTP_PROXY', 'http_proxy',
    'HTTPS_PROXY', 'https_proxy',
    'ALL_PROXY', 'all_proxy',
    'FTP_PROXY', 'ftp_proxy',
    'NO_PROXY', 'no_proxy'
  ]
  const clean = { ...env }
  for (const key of proxyKeys) {
    delete clean[key]
  }
  return clean
}
