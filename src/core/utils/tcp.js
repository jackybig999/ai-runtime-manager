// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2026 jackybig <jacky_big@outlook.com>
import net from 'net'

/**
 * Check if a TCP port is open on the given host.
 * @param {number} port - Port number to check
 * @param {string} [host='127.0.0.1'] - Host to check
 * @returns {Promise<boolean>} True if port is open, false otherwise
 */
export function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let resolved = false

    socket.setTimeout(800)

    function cleanup() {
      if (resolved) return
      resolved = true
      socket.removeAllListeners()
      try {
        socket.destroy()
      } catch {
        // ignore destroy errors
      }
    }

    socket.on('connect', () => {
      cleanup()
      resolve(true)
    })

    socket.on('timeout', () => {
      cleanup()
      resolve(false)
    })

    socket.on('error', () => {
      cleanup()
      resolve(false)
    })

    try {
      socket.connect(port, host)
    } catch {
      cleanup()
      resolve(false)
    }
  })
}
