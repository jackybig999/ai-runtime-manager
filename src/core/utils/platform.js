// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2026 jackybig <jacky_big@outlook.com>
import os from 'os'
import path from 'path'
import { execSync, execFileSync } from 'child_process'
import fs from 'fs'

// ─── helpers ──────────────────────────────────────────────────────────────────

function which(cmd) {
  try {
    const bin = process.platform === 'win32' ? 'where' : 'which'
    const result = execSync(`${bin} ${cmd}`, { encoding: 'utf-8', windowsHide: true })
    return result.trim().split(/\r?\n/)[0].trim() || null
  } catch { return null }
}

function fileExists(p) { try { fs.accessSync(p); return true } catch { return false } }

function resolveGlob(pattern) {
  const starIdx = pattern.indexOf('*')
  if (starIdx === -1) return fileExists(pattern) ? pattern : null
  const dirEnd = Math.max(pattern.lastIndexOf('/'), pattern.lastIndexOf(path.sep))
  const dir = pattern.substring(0, dirEnd + 1)
  if (!fileExists(dir)) return null
  try {
    const entries = fs.readdirSync(dir)
    const prefix = pattern.substring(dirEnd + 1, starIdx)
    const afterStar = pattern.substring(starIdx + 1).replace(/^[/\\]/, '')
    for (const e of entries) {
      if (e.startsWith(prefix)) {
        const full = path.join(dir, e, afterStar)
        if (fileExists(full)) return full
      }
    }
  } catch {}
  return null
}

// ─── CLI candidates (cross-platform, ordered: fast → slow) ────────────────────

const CLI_CANDIDATES = {
  claude: {
    win32: [
      () => which('claude'),
      () => path.join(process.env.APPDATA || '', 'npm', 'claude.cmd'),
      () => path.join(process.env.LOCALAPPDATA || '', 'npm', 'claude.cmd'),
      () => 'C:\\Program Files\\nodejs\\claude.cmd',
      () => 'C:\\Program Files (x86)\\nodejs\\claude.cmd',
    ],
    darwin: [
      () => which('claude'),
      () => '/usr/local/bin/claude',
      () => '/opt/homebrew/bin/claude',
      () => path.join(os.homedir(), '.npm-global', 'bin', 'claude'),
      () => resolveGlob(path.join(os.homedir(), '.nvm', 'versions', 'node', '*', 'bin', 'claude')),
      () => '/opt/local/bin/claude',
    ],
    linux: [
      () => which('claude'),
      () => '/usr/local/bin/claude',
      () => '/usr/bin/claude',
      () => path.join(os.homedir(), '.npm-global', 'bin', 'claude'),
      () => resolveGlob(path.join(os.homedir(), '.nvm', 'versions', 'node', '*', 'bin', 'claude')),
      () => '/snap/bin/claude',
    ],
  },
  codex: {
    win32: [
      () => which('codex'),
      () => path.join(process.env.APPDATA || '', 'npm', 'codex.cmd'),
      () => path.join(process.env.LOCALAPPDATA || '', 'npm', 'codex.cmd'),
      () => 'C:\\Program Files\\nodejs\\codex.cmd',
      () => 'C:\\Program Files (x86)\\nodejs\\codex.cmd',
    ],
    darwin: [
      () => which('codex'),
      () => '/usr/local/bin/codex',
      () => '/opt/homebrew/bin/codex',
      () => path.join(os.homedir(), '.npm-global', 'bin', 'codex'),
      () => resolveGlob(path.join(os.homedir(), '.nvm', 'versions', 'node', '*', 'bin', 'codex')),
    ],
    linux: [
      () => which('codex'),
      () => '/usr/local/bin/codex',
      () => '/usr/bin/codex',
      () => path.join(os.homedir(), '.npm-global', 'bin', 'codex'),
      () => resolveGlob(path.join(os.homedir(), '.nvm', 'versions', 'node', '*', 'bin', 'codex')),
    ],
  },
}

// ─── public API ───────────────────────────────────────────────────────────────

export function getPlatform() { return process.platform }
export function isWindows() { return process.platform === 'win32' }
export function isMacOS() { return process.platform === 'darwin' }
export function isLinux() { return process.platform === 'linux' }

/**
 * Find a CLI executable using candidate chain.
 * Tries each candidate in order, returns first match.
 * @param {'claude'|'codex'} name
 * @returns {string|null} Full path or null
 */
export function findCLIPath(name) {
  const candidates = CLI_CANDIDATES[name]?.[process.platform] || []
  for (const fn of candidates) {
    try {
      const p = fn()
      if (p && fileExists(p)) return path.resolve(p)
    } catch {}
  }
  return null
}

/**
 * Get CLI version by running <exe> --version.
 * @param {string} exePath
 * @returns {string}
 */
export function getCLIVersion(exePath) {
  if (!exePath || !fileExists(exePath)) return ''
  try {
    const isWin = process.platform === 'win32'
    const isCmd = isWin && exePath.endsWith('.cmd')
    let output
    if (isCmd) {
      output = execSync(`cmd /c "${exePath}" --version`, { encoding: 'utf-8', timeout: 8000, windowsHide: true })
    } else {
      output = execSync(`"${exePath}" --version`, { encoding: 'utf-8', timeout: 8000, shell: true, windowsHide: true })
    }
    const raw = output.trim().split('\n')[0].trim()
    // Strip trailing description like "2.1.150 (Claude Code)" → "2.1.150"
    return raw.replace(/\s*\(.*?\)\s*$/, '').trim()
  } catch (e) {
    const stderr = (e.stderr || '').trim()
    return stderr ? stderr.replace(/\s*\(.*?\)\s*$/, '').trim().split('\n')[0].trim() : ''
  }
}

/**
 * Get desktop app version from file metadata (no --version launch).
 */
export function getDesktopVersion(exePath) {
  if (!exePath || !fileExists(exePath)) return ''
  if (process.platform === 'win32') {
    try {
      const out = execSync(
        `powershell -NoProfile -Command "(Get-ItemProperty '${exePath}').VersionInfo.FileVersion"`,
        { encoding: 'utf-8', timeout: 5000, windowsHide: true }
      )
      return out.trim()
    } catch { return '' }
  }
  if (process.platform === 'darwin') {
    try {
      const appPath = exePath.replace(/\/Contents\/MacOS\/[^/]+$/, '')
      const out = execSync(`mdls -name kMDItemVersion -raw "${appPath}"`, { encoding: 'utf-8', timeout: 5000 })
      const v = out.trim()
      return v && v !== '(null)' ? v : ''
    } catch { return '' }
  }
  return ''
}

// ─── original exports (unchanged signatures) ──────────────────────────────────

function findWindowsExecutable(name) {
  const winPath = which(name)
  if (winPath) return winPath

  const commonPaths = {
    chrome: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe')
    ],
    chromium: [
      'C:\\Program Files\\Chromium\\Application\\chromium.exe',
      'C:\\Program Files (x86)\\Chromium\\Application\\chromium.exe'
    ]
  }

  for (const p of commonPaths[name] || []) {
    if (fs.existsSync(p)) return p
  }

  return name
}

export function resolveCommand(name) {
  const platform = process.platform

  if (platform === 'win32') {
    const known = ['claude', 'codex', 'chrome', 'chromium']
    if (known.includes(name)) {
      return findWindowsExecutable(name)
    }
    return name
  }

  switch (name) {
    case 'claude':
      return 'claude'
    case 'codex':
      return 'codex'
    case 'chrome':
      if (platform === 'darwin') return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      return 'google-chrome'
    case 'chromium':
      if (platform === 'darwin') return '/Applications/Chromium.app/Contents/MacOS/Chromium'
      return 'chromium-browser'
    default:
      return name
  }
}

export function scanBrowsers() {
  if (process.platform === 'darwin') {
    const browsers = [
      { key: 'chrome', name: 'Chrome', path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' },
      { key: 'edge', name: 'Edge', path: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge' },
      { key: 'firefox', name: 'Firefox', path: '/Applications/Firefox.app/Contents/MacOS/firefox' },
      { key: 'brave', name: 'Brave', path: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' }
    ]
    return browsers.filter(b => fs.existsSync(b.path)).map(b => ({ key: b.key, name: b.name, command: b.path }))
  }

  if (process.platform !== 'win32') return []

  const browsers = [
    { key: 'chrome', name: 'Chrome', paths: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe')
    ]},
    { key: 'edge', name: 'Edge', paths: [
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ]},
    { key: 'firefox', name: 'Firefox', paths: [
      'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
      'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe'
    ]},
    { key: 'brave', name: 'Brave', paths: [
      'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'
    ]},
    { key: 'opera', name: 'Opera', paths: [
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Opera', 'opera.exe')
    ]}
  ]

  const found = []
  for (const b of browsers) {
    try {
      const result = execSync(`cmd /c where ${b.key} 2>nul`, { encoding: 'utf-8', windowsHide: true }).trim()
      const firstLine = result.split('\n')[0].trim()
      if (firstLine) { found.push({ key: b.key, name: b.name, command: firstLine }); continue }
    } catch {}
    for (const p of b.paths) {
      if (fs.existsSync(p)) { found.push({ key: b.key, name: b.name, command: p }); break }
    }
  }
  return found
}

export function isProcessRunning(name) {
  if (process.platform !== 'win32') {
    try { execSync(`pgrep -x "${name}"`, { stdio: 'ignore' }); return true } catch { return false }
  }
  try {
    const result = execSync(`tasklist /FI "IMAGENAME eq ${name}" /NH`, { encoding: 'utf-8', windowsHide: true })
    // Language-independent: match process name instead of "no tasks" text
    return result.toLowerCase().includes(name.replace('.exe', ''))
  } catch { return false }
}

function findWindowsStoreApp(namePattern, exeRelPath) {
  try {
    const psCmd = `Get-AppxPackage | Where-Object { $_.Name -like '${namePattern}' } | Select-Object -First 1 InstallLocation`
    const out = execFileSync('powershell', ['-NoProfile', '-Command', psCmd], { encoding: 'utf-8', windowsHide: true })
    const m = out.match(/C:\\Program Files\\WindowsApps\\[^\r\n]+/)
    if (m) {
      const full = path.join(m[0].trim(), exeRelPath)
      if (fileExists(full)) return full
    }
  } catch {}
  return null
}

export function scanDesktopApps() {
  const found = {}

  if (process.platform === 'darwin') {
    const apps = [
      { key: 'claude-app', paths: [
        '/Applications/Claude.app',
        path.join(os.homedir(), 'Applications', 'Claude.app')
      ]},
      { key: 'codex-app', paths: [
        '/Applications/Codex.app',
        path.join(os.homedir(), 'Applications', 'Codex.app')
      ]}
    ]
    for (const app of apps) {
      for (const p of app.paths) { if (fileExists(p)) { found[app.key] = p; break } }
    }
    return found
  }

  if (process.platform !== 'win32') return {}

  const apps = [
    {
      key: 'claude-app',
      paths: [
        () => path.join(process.env.LOCALAPPDATA || '', 'AnthropicClaude', 'Claude.exe'),
        () => path.join(process.env.PROGRAMFILES || '', 'AnthropicClaude', 'Claude.exe'),
        () => path.join(os.homedir(), 'AppData', 'Local', 'AnthropicClaude', 'Claude.exe'),
        () => findWindowsStoreApp('Claude', 'app\\claude.exe'),
      ]
    },
    {
      key: 'codex-app',
      paths: [
        () => findWindowsStoreApp('OpenAI.Codex', 'app\\Codex.exe'),
      ]
    }
  ]

  for (const app of apps) {
    for (const fn of app.paths) {
      try {
        const p = fn()
        if (p && fileExists(p)) { found[app.key] = p; break }
      } catch {}
    }
  }
  return found
}

export function getUserDataDir(appName = 'ai-runtime-manager') {
  const home = os.homedir()
  if (isWindows()) return path.join(home, 'AppData', 'Local', appName)
  if (isMacOS()) return `${home}/Library/Application Support/${appName}`
  return `${home}/.config/${appName}`
}
