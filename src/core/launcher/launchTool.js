// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2026 jackybig <jacky_big@outlook.com>
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import { buildProxyEnv } from './envBuilder.js'
import { launchApp } from './appLauncher.js'
import processManager from './processManager.js'
import { resolveCommand, isProcessRunning } from '../utils/platform.js'
import logger from '../utils/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appsPath = path.resolve(__dirname, '../../../config/apps.json')

/**
 * Launch a CLI tool (claude or codex) with proxy environment.
 * @param {string} name - Tool name: 'claude' or 'codex'
 * @param {{protocol:string,host:string,port:number}} proxy
 * @param {object} [options={}]
 * @returns {object} Child process info
 */
export async function launchTool(name, proxy, options = {}) {
  let config
  try {
    config = JSON.parse(fs.readFileSync(appsPath, 'utf-8'))
  } catch (err) {
    logger.error(`Failed to read apps.json: ${err.message}`)
    config = { [name]: { command: name, args: [], type: 'cli' } }
  }

  const appConfig = config[name] || { command: name, args: [], cwd: '' }
  const command = resolveCommand(name)
  const env = buildProxyEnv(proxy)
  const cwd = (appConfig.cwd && appConfig.cwd.trim()) || options.cwd || process.cwd()

  const processName = process.platform === 'win32' ? `${name}.exe` : name
  const alreadyRunning = isProcessRunning(processName)
  const displayName = name === 'claude' ? 'Claude Code' : 'Codex CLI'

  if (alreadyRunning) {
    logger.info(`${displayName} already running, launching new instance...`)
  } else {
    logger.info(`${displayName} not running, launching...`)
  }

  logger.info(`Launching ${displayName} in ${cwd}...`)

  // Windows: open a new console window
  if (process.platform === 'win32') {
    const title = displayName
    const argsStr = (appConfig.args || []).join(' ')
    // Proxy env vars are inherited from the spawn env, not embedded in the command string
    const cmdStr = `start "${title}" cmd /k title ${title} ^& "${command}" ${argsStr}`
    const child = spawn(cmdStr,
      { shell: true, cwd, env, windowsHide: false, detached: true, stdio: 'ignore' }
    )

    child.on('error', (err) => {
      logger.error(`Launch error for ${name}: ${err.message}`)
    })

    // processManager registration deferred to caller after findNewCmdPid()
    // (intermediate shell PID dies immediately on Windows)
    return { pid: child.pid, process: child, command: name, _winPidPending: true, _meta: { app: name, proxy, cwd } }
  }

  // Non-Windows
  const child = launchApp(command, appConfig.args || [], {
    env,
    stdio: 'inherit',
    shell: false,
    detached: true,
    windowsHide: false,
    cwd,
    ...options
  })

  processManager.register(child, { app: name, proxy, cwd })
  return child
}
