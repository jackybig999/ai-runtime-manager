// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2026 jackybig <jacky_big@outlook.com>
import readline from 'readline'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import processManager from './core/launcher/processManager.js'
import { t } from './i18n/index.js'
import { findNewCmdPid } from './core/toolLifecycle.js'
import {
  printBanner, printInfo, askNumber,
  selectLanguage, selectProxyStep, selectCwdStep, confirmAndLaunch
} from './ui/prompts.js'
import {
  getRunningTools, refreshRunningPids,
  waitForAllTools, killAllStep, killByPid
} from './core/toolLifecycle.js'

const TOOL_META = {
  claude: { display: 'Claude Code' },
  codex: { display: 'Codex CLI' }
}
const toolSessions = new Map() // toolName → { proxy, cwd, pid }

// ─── main loop ─────────────────────────────────────────────────────────────────

export async function runInteractive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  processManager.setupCleanup()

  try {
    printBanner()
    await selectLanguage(rl)

    while (true) {
      const proxy = await selectProxyStep(rl)

      await refreshRunningPids(toolSessions)
      const running = getRunningTools(toolSessions, TOOL_META)
      if (running.length > 0) {
        console.log(chalk.yellow.bold(`  [${t('trayRunning')}]`))
        for (const r of running) {
          console.log(chalk.gray(`    ${r.display} — ${r.proxyText}`))
        }
        console.log()
      }

      console.log(chalk.yellow.bold(t('actionMenu')))
      console.log()
      console.log(`  ${chalk.bold(1)}. ${t('claudeCode')}`)
      console.log(`  ${chalk.bold(2)}. ${t('codexCLI')}`)
      if (running.length > 0) {
        console.log(`  ${chalk.bold(3)}. ${t('killSpecificTool')}`)
        console.log(`  ${chalk.bold(4)}. ${t('killAllProcesses')}`)
        console.log(`  ${chalk.bold(5)}. ${t('monitorTools')}`)
        console.log(`  ${chalk.bold(0)}. ${t('exitProgram')}`)
      } else {
        console.log(`  ${chalk.bold(3)}. ${t('killAllProcesses')}`)
        console.log(`  ${chalk.bold(0)}. ${t('exitProgram')}`)
      }
      console.log()

      const maxChoice = running.length > 0 ? 5 : 3
      const choice = await askNumber(rl, chalk.yellow(`  > ${t('pleaseSelect')}: `), 0, maxChoice)

      if (choice === 0) {
        console.log()
        printInfo(t('exited'))
        rl.close()
        process.exit(0)
      }

      if (running.length > 0 && choice === 3) {
        console.log()
        console.log(chalk.yellow.bold(`  ${t('selectToolToKill')}`))
        console.log()
        running.forEach((r, i) => {
          console.log(`  ${chalk.bold(i + 1)}. ${r.display} — ${r.proxyText}`)
        })
        console.log(`  ${chalk.bold(0)}. ${t('cancelled')}`)
        console.log()
        const killChoice = await askNumber(rl, chalk.yellow(`  > ${t('pleaseSelect')}: `), 0, running.length)
        if (killChoice >= 1 && killChoice <= running.length) {
          const target = running[killChoice - 1]
          await killByPid(target.pid)
          toolSessions.delete(target.key)
          console.log(chalk.green(`  [✓] ${target.display} ${t('allKilled')}`))
          console.log()
        }
        continue
      }

      const killAllChoice = running.length > 0 ? 4 : 3
      if (choice === killAllChoice) {
        await killAllStep(toolSessions, rl)
        continue
      }

      if (choice === 1 || choice === 2) {
        const toolName = choice === 1 ? 'claude' : 'codex'
        const cwd = await selectCwdStep(rl)
        const launched = await confirmAndLaunch(rl, toolName, proxy, cwd)

        if (launched) {
          const pid = await findNewCmdPid()
          toolSessions.set(toolName, { proxy, cwd, pid })
          console.log(chalk.gray(`  ${t('toolRunning')}`))
          console.log()
        }
        continue
      }

      if (running.length > 0 && choice === 5) {
        await waitForAllTools(toolSessions, TOOL_META)
        continue
      }
    }
  } catch (err) {
    console.error(chalk.red(`${t('initError')}: ${err.message}`))
    rl.close()
    process.exit(1)
  }
}

// Auto-run when executed directly
const __mainFile = fileURLToPath(import.meta.url)
if (process.argv[1] === __mainFile) {
  runInteractive().catch((err) => {
    console.error(chalk.red(`${t('launchFailed')}: ${err.message}`))
    process.exit(1)
  })
}
