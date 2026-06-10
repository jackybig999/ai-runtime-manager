// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2026 jackybig <jacky_big@outlook.com>
import chalk from 'chalk'
import { exec } from 'child_process'
import { promisify } from 'util'
import processManager from './launcher/processManager.js'
import { t } from '../i18n/index.js'
import { askYN, printSuccess, printInfo } from '../ui/prompts.js'

const execAsync = promisify(exec)

// ─── PID detection (Windows CLI tools run inside cmd.exe windows) ─────────────

export async function findNewCmdPid() {
  await new Promise(r => setTimeout(r, 800))
  try {
    const { stdout } = await execAsync(
      `powershell -Command "(Get-Process cmd | Sort-Object StartTime -Descending | Select-Object -First 1).Id"`,
      { timeout: 3000, windowsHide: true }
    )
    return parseInt(stdout.trim()) || null
  } catch { return null }
}

export async function isPidAlive(pid) {
  if (!pid) return false
  try {
    await execAsync(`tasklist /fi "PID eq ${pid}" /nh`, { timeout: 2000, windowsHide: true })
    return true
  } catch { return false }
}

export async function killByPid(pid) {
  if (!pid) return
  try {
    await execAsync(`taskkill /PID ${pid} /F /T`, { timeout: 5000, windowsHide: true })
  } catch {}
}

// ─── session helpers ──────────────────────────────────────────────────────────

export function getRunningTools(sessions, toolMeta) {
  return Array.from(sessions.entries())
    .filter(([, s]) => s.pid)
    .map(([key, s]) => ({
      key,
      display: toolMeta[key]?.display || key,
      proxyText: s.proxy ? `${s.proxy.host}:${s.proxy.port}` : t('trayDirect'),
      pid: s.pid
    }))
}

export async function refreshRunningPids(sessions) {
  for (const [key, s] of sessions) {
    if (s.pid && !(await isPidAlive(s.pid))) {
      sessions.delete(key)
    }
  }
}

// ─── wait / kill ──────────────────────────────────────────────────────────────

export async function waitForAllTools(sessions, toolMeta) {
  return new Promise((resolve) => {
    let goneStreak = 0

    const check = async () => {
      await refreshRunningPids(sessions)
      const running = getRunningTools(sessions, toolMeta)

      if (running.length === 0) {
        goneStreak++
        if (goneStreak >= 3) {
          sessions.clear()
          console.log(chalk.blue(`  [i] ${t('toolClosed')}`))
          console.log()
          resolve()
          return
        }
      } else {
        goneStreak = 0
        console.clear()
        console.log(chalk.red.bold('  ╔══════════════════════════════════════════╗'))
        console.log(chalk.red.bold(`  ║  ${t('taskCompleteWarning')}  ║`))
        console.log(chalk.red.bold('  ╚══════════════════════════════════════════╝'))
        console.log()
        console.log(chalk.yellow.bold(`  [${t('trayRunning')}]`))
        for (const r of running) {
          console.log(chalk.white(`    ${r.display} — ${r.proxyText}`))
        }
        console.log()
        console.log(chalk.gray(`  ${t('toolRunning')}`))
      }

      setTimeout(check, 2000)
    }
    setTimeout(check, 2000)
  })
}

export async function killAllStep(sessions, rl) {
  const confirm = await askYN(rl, chalk.yellow(`  > ${t('confirmKill')} (y/n): `))
  if (!confirm) { printInfo(t('cancelled')); return false }
  console.log()

  for (const [, s] of sessions) {
    await killByPid(s.pid)
  }
  sessions.clear()

  if (process.platform === 'win32') {
    try {
      await execAsync(
        `powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle -like '*Claude Code*' -or $_.MainWindowTitle -like '*Codex CLI*'} | Stop-Process -Force"`,
        { timeout: 5000, windowsHide: true }
      )
    } catch {}
  }
  await processManager.killAll()
  printSuccess(t('allKilled'))
  console.log()
  return true
}
