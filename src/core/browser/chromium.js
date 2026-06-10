// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2026 jackybig <jacky_big@outlook.com>
import { launchApp } from '../launcher/appLauncher.js'
import processManager from '../launcher/processManager.js'
import { resolveCommand } from '../utils/platform.js'
import logger from '../utils/logger.js'

/**
 * Launch Chromium/Chrome browser with proxy configuration.
 * @param {{protocol:string,host:string,port:number}} proxy
 * @param {object} [options={}]
 * @param {string} [options.profileDir]
 * @param {string[]} [options.extraArgs=[]]
 * @returns {object} Child process info
 */
export async function launchChromium(proxy, options = {}) {
  const { profileDir, extraArgs = [] } = options

  const command = resolveCommand('chrome')

  const args = [
    '--no-first-run',
    '--no-default-browser-check'
  ]

  if (proxy && proxy.port) {
    const proxyUrl = `${proxy.protocol}://${proxy.host}:${proxy.port}`
    args.unshift(`--proxy-server=${proxyUrl}`)
  }

  if (profileDir) {
    args.push(`--user-data-dir=${profileDir}`)
  }

  if (extraArgs.length > 0) {
    args.push(...extraArgs)
  }

  logger.info(`Launching Chromium${proxy && proxy.port ? ` with proxy ${proxy.protocol}://${proxy.host}:${proxy.port}` : ''}...`)

  const child = launchApp(command, args, {
    stdio: 'ignore',
    shell: false,
    detached: true,
    windowsHide: false
  })

  processManager.register(child, { app: 'chrome', proxy, profileDir })
  return child
}
