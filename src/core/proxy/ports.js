// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2026 jackybig <jacky_big@outlook.com>
/**
 * Common proxy ports and port configuration utilities.
 */

const commonProxyPorts = [
  // Clash / Clash Meta
  7890,  // Clash default HTTP/SOCKS5 mixed
  7891,  // Clash mixed
  7892,  // Clash alt
  7893,  // Clash redir
  // SOCKS5
  1080,  // SOCKS default
  1081, 1082, 1083,
  // Surge / Quantumult X
  9090,  // Surge HTTP
  9091,
  // Fiddler / Charles
  8888,  // Fiddler, Charles
  8889,
  // Squid / Privoxy
  3128,  // Squid
  8118,  // Privoxy
  // v2rayN / v2ray / Xray
  10808, // v2rayN SOCKS5
  10809, // v2rayN HTTP
  20171, // v2rayN default socks
  20172, // v2rayN default http
  // Clash Verge / mihomo
  4780,  // Clash Verge HTTP
  4781,  // Clash Verge SOCKS5
  // sing-box
  2333,  // sing-box common custom
  // Shadowsocks
  1087,  // ss-local default
  8388,  // shadowsocks-libev
  // Trojan / Xray custom
  51837, // common custom
  // Netch
  2801,
  1085,
  // Nekoray / Nekobox
  2080,
  2443,
]

/**
 * Get list of ports to scan based on optional port config.
 * @param {Object} config
 * @param {number[]} config.ports - explicit ports to check
 * @param {number} config.start - scan range start
 * @param {number} config.end - scan range end
 * @returns {number[]} Port numbers to scan
 */
export function getPorts(config) {
  if (config?.ports?.length) {
    return config.ports
  }
  if (config?.start && config?.end) {
    const ports = []
    for (let p = config.start; p <= config.end; p++) {
      ports.push(p)
    }
    return ports
  }
  return [...commonProxyPorts]
}

/**
 * Port-to-protocol mapping for common proxy ports.
 */
export const DEFAULT_PORTS_CONFIG = {
  // Clash / Clash Meta
  7890: { protocol: 'socks5', name: 'Clash' },
  7891: { protocol: 'socks5', name: 'Clash Mixed' },
  7892: { protocol: 'socks5', name: 'Clash Alt' },
  7893: { protocol: 'http', name: 'Clash Redir' },
  // SOCKS5
  1080: { protocol: 'socks5', name: 'SOCKS5' },
  1081: { protocol: 'socks5', name: 'SOCKS5 Alt' },
  1082: { protocol: 'socks5', name: 'SOCKS5 Alt' },
  1083: { protocol: 'socks5', name: 'SOCKS5 Alt' },
  1085: { protocol: 'socks5', name: 'SOCKS5 Alt' },
  1087: { protocol: 'socks5', name: 'Shadowsocks' },
  // v2rayN
  10808: { protocol: 'socks5', name: 'v2rayN SOCKS5' },
  10809: { protocol: 'http', name: 'v2rayN HTTP' },
  20171: { protocol: 'socks5', name: 'v2rayN SOCKS5' },
  20172: { protocol: 'http', name: 'v2rayN HTTP' },
  // Clash Verge / mihomo
  4780: { protocol: 'http', name: 'Clash Verge' },
  4781: { protocol: 'socks5', name: 'Clash Verge SOCKS5' },
  // sing-box
  2333: { protocol: 'http', name: 'sing-box' },
  // Shadowsocks
  8388: { protocol: 'socks5', name: 'Shadowsocks' },
  // Netch
  2801: { protocol: 'socks5', name: 'Netch' },
  // Nekoray / Nekobox
  2080: { protocol: 'http', name: 'Nekoray' },
  2443: { protocol: 'socks5', name: 'Nekoray SOCKS5' },
  // HTTP common
  8080: { protocol: 'http', name: 'HTTP Proxy' },
  8081: { protocol: 'http', name: 'HTTP Proxy Alt' },
  8082: { protocol: 'http', name: 'HTTP Proxy Alt' },
  9090: { protocol: 'http', name: 'Surge' },
  9091: { protocol: 'http', name: 'Surge Alt' },
  8000: { protocol: 'http', name: 'HTTP Dev' },
  8001: { protocol: 'http', name: 'HTTP Dev Alt' },
  8002: { protocol: 'http', name: 'HTTP Dev Alt' },
  3000: { protocol: 'http', name: 'Dev Server' },
  3001: { protocol: 'http', name: 'Dev Server Alt' },
  5000: { protocol: 'http', name: 'Flask/Dev' },
  5001: { protocol: 'http', name: 'Flask/Dev Alt' },
  8888: { protocol: 'http', name: 'Fiddler/Charles' },
  8889: { protocol: 'http', name: 'Fiddler/Charles Alt' },
  3128: { protocol: 'http', name: 'Squid' },
  8118: { protocol: 'http', name: 'Privoxy' },
  // HTTPS
  443: { protocol: 'https', name: 'HTTPS' },
  8443: { protocol: 'https', name: 'HTTPS Alt' },
  51837: { protocol: 'socks5', name: 'Xray/Trojan' },
}

export { commonProxyPorts }
