// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2026 jackybig <jacky_big@outlook.com>
import { isWindows } from '../utils/platform.js'
import logger from '../utils/logger.js'

class ProcessManager {
  constructor() {
    this.processes = new Map()
  }

  /**
   * Setup global signal handlers for graceful shutdown.
   * Should be called once by the main entry point.
   */
  setupCleanup() {
    const signals = ['SIGINT', 'SIGTERM']
    for (const sig of signals) {
      process.on(sig, async () => {
        logger.info(`Received ${sig}, cleaning up...`)
        await this.killAll()
        process.exit(0)
      })
    }
  }

  /**
   * Register a child process for lifecycle management.
   * @param {{pid:number,process:import('child_process').ChildProcess,command:string}} child
   * @param {object} [meta={}]
 */
  register(child, meta = {}) {
    if (!child || !child.pid) {
      logger.warn('Attempted to register invalid child process')
      return
    }

    this.processes.set(child.pid, {
      process: child.process,
      command: child.command,
      startTime: Date.now(),
      ...meta
    })

    logger.debug(`Registered process ${child.pid}: ${child.command}`)

    child.process.on('exit', () => {
      this.unregister(child.pid)
    })
  }

  /**
   * Unregister a process by PID.
   * @param {number} pid
   */
  unregister(pid) {
    if (this.processes.has(pid)) {
      const info = this.processes.get(pid)
      logger.debug(`Unregistered process ${pid}: ${info.command}`)
      this.processes.delete(pid)
    }
  }

  /**
   * Kill a specific process.
   * @param {number} pid
   * @param {string} [signal='SIGTERM']
   */
  kill(pid, signal = 'SIGTERM') {
    const info = this.processes.get(pid)
    if (!info) {
      logger.warn(`Process ${pid} not found in registry`)
      return false
    }

    try {
      if (isWindows()) {
        info.process.kill()
      } else {
        info.process.kill(signal)
      }
      logger.info(`Sent ${signal} to process ${pid}: ${info.command}`)
      return true
    } catch (err) {
      logger.error(`Failed to kill process ${pid}: ${err.message}`)
      return false
    }
  }

  /**
   * Kill all registered processes gracefully, then forcefully.
   */
  async killAll() {
    if (this.processes.size === 0) {
      return
    }

    logger.info(`Terminating ${this.processes.size} registered process(es)...`)

    // First round: graceful termination
    for (const [pid, info] of this.processes) {
      try {
        if (isWindows()) {
          info.process.kill()
        } else {
          info.process.kill('SIGTERM')
        }
      } catch (err) {
        logger.error(`Error terminating ${pid}: ${err.message}`)
      }
    }

    // Wait 3 seconds, then force kill remaining
    await new Promise((resolve) => setTimeout(resolve, 3000))

    for (const [pid, info] of this.processes) {
      if (!info.process.killed) {
        try {
          info.process.kill('SIGKILL')
        } catch {
          // ignore
        }
      }
    }

    this.processes.clear()
    logger.info('All processes terminated')
  }

  /**
   * List all registered processes.
   * @returns {Array<{pid:number,command:string,startTime:number}>}
   */
  list() {
    const result = []
    for (const [pid, info] of this.processes) {
      result.push({
        pid,
        command: info.command,
        startTime: info.startTime
      })
    }
    return result
  }
}

const processManager = new ProcessManager()
export default processManager
