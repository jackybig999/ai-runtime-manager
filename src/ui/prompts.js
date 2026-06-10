// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2026 jackybig <jacky_big@outlook.com>
import readline from 'readline'
import chalk from 'chalk'
import path from 'path'
import { detectProxy } from '../core/proxy/detector.js'
import logger from '../core/utils/logger.js'
import { launchClaude } from '../core/launcher/claude.js'
import { launchCodex } from '../core/launcher/codex.js'
import { t, setLang, getLang } from '../i18n/index.js'

// ─── output helpers ───────────────────────────────────────────────────────────

export function printBanner() {
  console.clear()
  console.log(chalk.cyan.bold('╔══════════════════════════════════════════╗'))
  console.log(chalk.cyan.bold('║     AI Runtime Manager - 交互启动器      ║'))
  console.log(chalk.cyan.bold('╚══════════════════════════════════════════╝'))
  console.log()
}

export function printSuccess(text) { console.log(chalk.green(`  [✓] ${text}`)) }
export function printError(text) { console.log(chalk.red(`  [✗] ${text}`)) }
export function printInfo(text) { console.log(chalk.blue(`  [i] ${text}`)) }

// ─── input helpers ────────────────────────────────────────────────────────────

export function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()))
  })
}

export async function askYN(rl, question) {
  while (true) {
    const answer = await ask(rl, question)
    const a = answer.toLowerCase()
    if (a === 'y') return true
    if (a === 'n') return false
  }
}

export async function askNumber(rl, question, min, max, def) {
  while (true) {
    const answer = await ask(rl, question)
    if (answer === '' && def !== undefined) return def
    const n = parseInt(answer, 10)
    if (!isNaN(n) && n >= min && n <= max) return n
  }
}

// ─── interactive steps ────────────────────────────────────────────────────────

export async function selectLanguage(rl) {
  console.log(chalk.yellow.bold(t('langSelect')))
  console.log()
  console.log(`  ${chalk.bold(1)}. ${t('langCN')}`)
  console.log(`  ${chalk.bold(2)}. ${t('langEN')}`)
  console.log()

  const saved = getLang()
  const def = saved === 'zh-CN' ? 1 : 2
  const choice = await askNumber(rl, chalk.yellow(`  > ${t('pleaseSelect')} (${t('langLabel')}, ${t('defaultOpt')} ${def}): `), 1, 2, def)
  const lang = choice === 2 ? 'en' : 'zh-CN'
  setLang(lang)
  console.log()
}

export async function selectProxyStep(rl) {
  console.log(chalk.yellow.bold(t('proxyDetection')))
  console.log()

  const proxies = await detectProxy({ preferHttpProxy: true, verify: true, timeout: 5000 })

  if (!proxies || proxies.length === 0) {
    printError(t('noProxy'))
    printInfo(t('commonPortsHint'))
    console.log()
    return null
  }

  proxies.forEach((p, idx) => {
    const verified = p.verified ? chalk.green(t('verified')) : chalk.yellow(t('unverified'))
    console.log(`  ${chalk.bold(idx + 1)}. ${p.protocol}://${p.host}:${p.port} (${p.latency}ms) [${verified}]`)
  })
  console.log()

  const idx = await askNumber(rl, chalk.yellow(`  > ${t('pleaseSelect')} (1-${proxies.length}, ${t('defaultOpt')} 1): `), 1, proxies.length, 1)
  const selected = proxies[idx - 1]
  printSuccess(`${t('proxySelected')}: ${selected.protocol}://${selected.host}:${selected.port}`)
  console.log()
  return selected
}

export async function selectCwdStep(rl) {
  console.log(chalk.yellow.bold(t('workingDir')))
  console.log()

  const current = process.cwd()
  printInfo(`${t('currentDir')}: ${current}`)
  console.log()
  console.log(`  ${chalk.bold(1)}. ${t('useCurrentDir')}`)
  console.log(`  ${chalk.bold(2)}. ${t('enterOtherDir')}`)
  console.log()

  const dirChoice = await askNumber(rl, chalk.yellow(`  > ${t('pleaseSelect')} (${t('defaultOpt')} 1): `), 1, 2, 1)
  if (dirChoice === 2) {
    const dir = await ask(rl, chalk.yellow(`  > ${t('enterDirPath')}: `))
    if (dir && dir.trim()) {
      const resolved = path.resolve(dir.trim())
      printSuccess(`${t('workingDir')}: ${resolved}`)
      console.log()
      return resolved
    }
  }

  printSuccess(`${t('workingDir')}: ${current}`)
  console.log()
  return current
}

export async function confirmAndLaunch(rl, toolName, proxy, cwd) {
  console.log(chalk.yellow.bold(t('launchConfirm')))
  console.log()

  const TOOL_NAMES = { claude: t('claudeCode'), codex: t('codexCLI') }
  console.log(`  ${t('toolLabel')}: ${chalk.white.bold(TOOL_NAMES[toolName] || toolName)}`)
  console.log(`  ${t('dirLabel')}: ${chalk.white(cwd)}`)

  if (proxy) {
    console.log(`  ${t('proxyLabel')}: ${chalk.green(`${proxy.protocol}://${proxy.host}:${proxy.port}`)}`)
  } else {
    console.log(`  ${t('proxyLabel')}: ${chalk.red(t('none'))}`)
  }
  console.log()

  console.log(chalk.red.bold(`  ╔══════════════════════════════════════════╗`))
  console.log(chalk.red.bold(`  ║  ${t('taskCompleteWarning')}  ║`))
  console.log(chalk.red.bold(`  ╚══════════════════════════════════════════╝`))
  console.log()

  if (!proxy) {
    printError(t('noProxyWarning'))
    const force = await askYN(rl, chalk.yellow(`  > ${t('forceContinue')} (y/n): `))
    if (!force) { printInfo(t('cancelled')); return false }
    console.log()
  }

  const confirm = await askYN(rl, chalk.yellow(`  > ${t('confirmLaunch')} (y/n): `))
  if (!confirm) { printInfo(t('cancelled')); return false }
  console.log()

  logger.setLogLevel('info')

  let result
  try {
    if (toolName === 'claude') result = await launchClaude(proxy, { cwd })
    else if (toolName === 'codex') result = await launchCodex(proxy, { cwd })
    printSuccess(t('launchSuccess'))
    return result
  } catch (err) {
    printError(`${t('launchFail')}: ${err.message}`)
    return null
  }
}
