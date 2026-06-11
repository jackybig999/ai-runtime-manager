// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2026 jackybig <jacky_big@outlook.com>
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { launchApp } from './appLauncher.js'
import processManager from './processManager.js'
import { resolveCommand } from '../utils/platform.js'
import logger from '../utils/logger.js'
import embeddedAppsConfig from '../../../config/apps.json' with { type: 'json' }

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appsPath = path.resolve(__dirname, '../../../config/apps.json')

/**
 * Launch a browser application with proxy settings.
 * @param {{protocol:string,host:string,port:number}} proxy
 * @param {object} [options={}]
 * @param {string} [options.appKey='chrome']
 * @param {string} [options.profileDir]
 * @returns {object} Child process info
 */
export async function launchBrowser(proxy, options = {}) {
  const { appKey = 'chrome', profileDir } = options

  let config
  try {
    config = JSON.parse(fs.readFileSync(appsPath, 'utf-8'))
  } catch {
    config = embeddedAppsConfig
  }

  const appConfig = config[appKey] || {
    command: appKey,
    args: [],
    type: 'browser',
    proxyFlag: '--proxy-server',
    userDataDirFlag: '--user-data-dir'
  }

  const command = resolveCommand(appKey)

  const args = [...(appConfig.args || [])]

  if (proxy && proxy.port && appConfig.proxyFlag) {
    const proxyUrl = `${proxy.protocol}://${proxy.host}:${proxy.port}`
    args.push(`${appConfig.proxyFlag}=${proxyUrl}`)
  }

  if (profileDir && appConfig.userDataDirFlag) {
    args.push(`${appConfig.userDataDirFlag}=${profileDir}`)
  }

  logger.info(`Launching ${appKey}...`)

  const child = launchApp(command, args, {
    stdio: 'ignore',
    shell: false,
    detached: true,
    windowsHide: false
  })

  processManager.register(child, { app: appKey, proxy, profileDir })
  return child
}
