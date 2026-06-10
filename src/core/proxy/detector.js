// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2026 jackybig <jacky_big@outlook.com>
import { getPorts } from './ports.js'
import { checkPort } from '../utils/tcp.js'
import { detectProtocol, isSocksProtocol } from './protocols.js'
import http from 'http'
import net from 'net'
import { exec } from 'child_process'
import { promisify } from 'util'
import logger from '../utils/logger.js'

const _verifyCache = new Map() // 'host:port' → { verified: boolean, time: number }
const VERIFY_CACHE_TTL = 30000 // 30s

const execAsync = promisify(exec)

// Proxy process names (case-insensitive match)
const PROXY_PROCESS_NAMES = [
  'clash', 'mihomo', 'clash-verge', 'clash-meta',
  'v2ray', 'v2rayn', 'xray', 'xray-core',
  'ss-local', 'shadowsocks', 'shadowsocks-libev',
  'sing-box',
  'nekoray', 'nekobox',
  'netch',
  'surge',
  'trojan', 'trojan-go',
  'hysteria', 'hysteria2',
  'naive', 'naiveproxy',
  'privoxy', 'squid',
  'fiddler', 'charles',
  'qv2ray',
]

// Only accept process-discovered ports that fall within known proxy port ranges.
// This excludes management APIs, dashboards, PAC servers, etc.
const PROXY_PORT_RANGES = [
  [1080, 1099],     // SOCKS5
  [4780, 4799],     // Clash Verge
  [7890, 7899],     // Clash
  [10808, 10809],   // v2rayN (SOCKS5/HTTP only, not mgmt ports)
  [20171, 20172],   // v2rayN alt
  [2080, 2089],     // Nekoray HTTP
  [2330, 2339],     // sing-box
  [2440, 2449],     // Nekoray SOCKS5
  [2800, 2809],     // Netch
  [8080, 8089],     // HTTP proxy common
  [8388, 8389],     // Shadowsocks
  [8888, 8889],     // Fiddler/Charles
  [3128, 3128],     // Squid
  [8118, 8118],     // Privoxy
  [51830, 51839],   // Trojan/Xray
  [9090, 9091],     // Surge (proxy port only, not controller)
]

function inProxyRange(port) {
  return PROXY_PORT_RANGES.some(([lo, hi]) => port >= lo && port <= hi)
}

async function discoverProxyProcessPorts() {
  // Windows: cross-reference tasklist PIDs with netstat ports
  try {
    const { stdout: tasklistOut } = await execAsync('tasklist /FO CSV /NH', { timeout: 3000, windowsHide: true })

    const proxyPids = new Set()
    for (const line of tasklistOut.split('\n')) {
      const parts = line.match(/"([^"]+)","(\d+)"/)
      if (!parts) continue
      const name = parts[1].toLowerCase()
      const pid = parseInt(parts[2], 10)
      if (PROXY_PROCESS_NAMES.some(pn => name.includes(pn))) {
        proxyPids.add(pid)
      }
    }

    if (proxyPids.size === 0) return []

    // Get listening ports from netstat, only keep those in proxy port ranges
    const { stdout: netstatOut } = await execAsync('netstat -ano -p TCP', { timeout: 3000, windowsHide: true })

    const ports = new Set()
    for (const line of netstatOut.split('\n')) {
      if (!line.includes('LISTENING')) continue
      const m = line.match(/(?:127\.0\.0\.1|0\.0\.0\.0):(\d+)\s+.*LISTENING\s+(\d+)/)
      if (!m) continue
      const port = parseInt(m[1], 10)
      const pid = parseInt(m[2], 10)
      if (proxyPids.has(pid) && port >= 1024 && inProxyRange(port)) {
        ports.add(port)
      }
    }

    logger.info(`[Detector] proxy processes found, ${ports.size} ports in range`)
    return [...ports]
  } catch (e) {
    logger.error(`[Detector] process detection failed: ${e.message}`)
    return []
  }
}

function verifyHttpProxy(proxy, timeout = 5000) {
  return new Promise((resolve) => {
    const req = http.request({
      host: proxy.host,
      port: proxy.port,
      method: 'CONNECT',
      path: 'www.google.com:443',
      timeout
    })

    req.on('connect', () => { req.destroy(); resolve(true) })
    req.on('error', () => { req.destroy(); resolve(false) })
    req.on('timeout', () => { req.destroy(); resolve(false) })
    req.end()
  })
}

function verifySocks5Proxy(proxy, timeout = 5000) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let resolved = false

    function cleanup() {
      if (resolved) return
      resolved = true
      socket.removeAllListeners()
      try { socket.destroy() } catch (err) { logger.error('[Detector] socket destroy failed: ' + err.message) }
    }

    socket.setTimeout(timeout)

    socket.on('connect', () => {
      socket.write(Buffer.from([0x05, 0x01, 0x00]))
    })

    socket.on('data', (data) => {
      cleanup()
      resolve(data.length >= 2 && data[0] === 0x05)
    })

    socket.on('timeout', () => { cleanup(); resolve(false) })
    socket.on('error', () => { cleanup(); resolve(false) })

    try { socket.connect(proxy.port, proxy.host) } catch (err) { logger.error('[Detector] socket connect failed: ' + err.message); cleanup(); resolve(false) }
  })
}

/**
 * Detect available local proxy servers.
 * Scans known proxy ports + ports from running proxy processes (filtered by proxy port ranges).
 */
export async function detectProxy(options = {}) {
  const {
    preferHttpProxy = false,
    host = '127.0.0.1',
    verify = true,
    timeout = 5000,
    portConfig
  } = options

  const knownPorts = getPorts(portConfig)

  let processPorts = []
  try { processPorts = await discoverProxyProcessPorts() } catch (err) {
    logger.error('[Detector] discoverProxyProcessPorts failed: ' + err.message)
  }

  const allPorts = [...new Set([...knownPorts, ...processPorts])]
  logger.info(`[Detector] Scanning ${allPorts.length} ports (${knownPorts.length} known + ${processPorts.length} from proxy processes)`)

  // Phase 1: parallel TCP scan
  const t0 = Date.now()
  const checkResults = await Promise.allSettled(
    allPorts.map(async (port) => {
      const start = Date.now()
      const opened = await checkPort(port, host)
      return { port, opened, latency: Date.now() - start }
    })
  )

  const openPorts = checkResults
    .filter(r => r.status === 'fulfilled' && r.value.opened)
    .map(r => ({ port: r.value.port, latency: r.value.latency }))

  logger.info(`[Detector] Phase 1: ${Date.now() - t0}ms, ${openPorts.length} open`)

  if (openPorts.length === 0) return null

  // Phase 2: parallel verification
  const vt0 = Date.now()
  const verifiedResults = await Promise.allSettled(
    openPorts.map(async ({ port, latency }) => {
      const protocol = detectProtocol(port)
      const proxy = { host, port, protocol }

      let verified = false
      if (verify) {
        const cacheKey = `${host}:${port}`
        const cached = _verifyCache.get(cacheKey)
        if (cached && (Date.now() - cached.time) < VERIFY_CACHE_TTL) {
          verified = cached.verified
        } else {
          try {
            verified = isSocksProtocol(protocol)
              ? await verifySocks5Proxy(proxy, timeout)
              : await verifyHttpProxy(proxy, timeout)
          } catch (err) {
            logger.error('[Detector] proxy verification failed: ' + err.message)
            verified = false
          }
          _verifyCache.set(cacheKey, { verified, time: Date.now() })
        }
      } else {
        verified = true
      }

      return { host, port, protocol, latency, verified }
    })
  )

  let results = verifiedResults
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)

  if (verify) results = results.filter(r => r.verified)

  logger.info(`[Detector] Phase 2: ${Date.now() - vt0}ms, ${results.length} verified`)

  if (results.length === 0) return null

  results.sort((a, b) => {
    if (preferHttpProxy) {
      const aIsHttp = a.protocol === 'http'
      const bIsHttp = b.protocol === 'http'
      if (aIsHttp && !bIsHttp) return -1
      if (!aIsHttp && bIsHttp) return 1
    }
    return a.latency - b.latency
  })

  return results
}
