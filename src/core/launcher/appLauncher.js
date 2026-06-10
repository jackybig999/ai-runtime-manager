// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2026 jackybig <jacky_big@outlook.com>
import { spawn } from 'child_process'
import logger from '../utils/logger.js'

/**
 * Launch an application with the given command, args, and environment.
 * @param {string} command
 * @param {string[]} [args=[]]
 * @param {object} [options={}]
 * @param {object} [options.env]
 * @param {string} [options.stdio='inherit']
 * @param {boolean} [options.shell=false]
 * @param {boolean} [options.detached=false]
 * @param {string} [options.cwd]
 * @returns {{pid:number,process:import('child_process').ChildProcess,command:string}}
 */
export function launchApp(command, args = [], options = {}) {
  const {
    env,
    stdio = 'inherit',
    shell = false,
    detached = false,
    cwd
  } = options

  logger.info(`Launching: ${command} ${args.join(' ')}`)

  const child = spawn(command, args, {
    stdio,
    shell,
    detached,
    cwd,
    env: env || process.env,
    windowsHide: false
  })

  child.on('error', (err) => {
    logger.error(`Launch error for ${command}: ${err.message}`)
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      logger.info(`${command} exited with signal ${signal}`)
    } else if (code !== 0 && code !== null) {
      logger.warn(`${command} exited with code ${code}`)
    } else {
      logger.info(`${command} exited normally`)
    }
  })

  return {
    pid: child.pid,
    process: child,
    command
  }
}
