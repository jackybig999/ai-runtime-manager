// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2026 jackybig <jacky_big@outlook.com>
import { DEFAULT_PORTS_CONFIG } from './ports.js'

/**
 * Detect protocol based on port number.
 * @param {number} port - Proxy port
 * @returns {'http'|'socks5'|'socks5h'|'https'}
 */
export function detectProtocol(port) {
  const config = DEFAULT_PORTS_CONFIG[port]
  if (config) {
    return config.protocol
  }

  // Fallback heuristics
  if (port === 443 || port === 8443) {
    return 'https'
  }

  // Common SOCKS5 ports
  if (port === 1080 || port === 10808 || port === 10809) {
    return 'socks5'
  }

  // Default to http for unknown ports
  return 'http'
}

/**
 * Check if the given protocol is a SOCKS variant.
 * @param {string} protocol - Protocol string
 * @returns {boolean}
 */
export function isSocksProtocol(protocol) {
  return protocol === 'socks5' || protocol === 'socks5h'
}

/**
 * Get human-readable name for a port.
 * @param {number} port - Proxy port
 * @returns {string}
 */
export function getPortName(port) {
  const config = DEFAULT_PORTS_CONFIG[port]
  return config ? config.name : `Port ${port}`
}
