// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2026 jackybig <jacky_big@outlook.com>
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import os from 'os'

const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

const COLORS = {
  debug: chalk.gray,
  info: chalk.green,
  warn: chalk.yellow,
  error: chalk.red
}

const LABELS = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR'
}

class Logger {
  constructor() {
    this.level = 'info'
    this.logDir = path.resolve(process.cwd(), 'logs')
    this._ensureLogDir()
  }

  setLogLevel(level) {
    if (LEVELS[level] !== undefined) {
      this.level = level
    }
  }

  _ensureLogDir() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true })
      }
    } catch {
      // ignore
    }
  }

  _getLogFile() {
    const now = new Date()
    const date = now.toISOString().split('T')[0]
    return path.join(this.logDir, `arm-${date}.log`)
  }

  _formatTime() {
    const now = new Date()
    return now.toISOString().replace('T', ' ').split('.')[0]
  }

  _write(level, message) {
    if (LEVELS[level] < LEVELS[this.level]) {
      return
    }

    const time = this._formatTime()
    const label = LABELS[level]
    const line = `[${time}] [${label}] ${message}${os.EOL}`

    // Console output with color
    const colorFn = COLORS[level] || chalk.white
    console.log(colorFn(line.trim()))

    // File output
    try {
      this._ensureLogDir()
      fs.appendFileSync(this._getLogFile(), line)
    } catch {
      // ignore file write errors
    }
  }

  debug(message) {
    this._write('debug', message)
  }

  info(message) {
    this._write('info', message)
  }

  warn(message) {
    this._write('warn', message)
  }

  error(message) {
    this._write('error', message)
  }
}

const logger = new Logger()
export default logger
