// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2026 jackybig <jacky_big@outlook.com>
import fs from 'fs'
import path from 'path'
import os from 'os'

const HOME = os.homedir()

export const SOURCES = {
  claude: { name: 'Claude Code',  icon: '🤖', dir: path.join(HOME, '.claude'),  type: 'jsonl' },
  codex:  { name: 'Codex CLI',    icon: '⚡', dir: path.join(HOME, '.codex'),   type: 'jsonl' },
}

function countLines(fp) {
  try {
    const buf = fs.readFileSync(fp)
    let n = 0
    for (let i = 0; i < buf.length; i++) { if (buf[i] === 10) n++ }
    return n
  } catch { return 0 }
}

// ─── Claude Code ─────────────────────────────────────────────────────────────

function scanClaude() {
  const sessions = []
  const projectsDir = path.join(SOURCES.claude.dir, 'projects')
  const historyPath = path.join(SOURCES.claude.dir, 'history.jsonl')

  if (!fs.existsSync(projectsDir)) return sessions

  const projects = fs.readdirSync(projectsDir)
  for (const project of projects) {
    const pPath = path.join(projectsDir, project)
    if (!fs.statSync(pPath).isDirectory()) continue

    const files = fs.readdirSync(pPath)
    for (const f of files) {
      if (!f.endsWith('.jsonl')) continue
      const sessionId = f.replace('.jsonl', '')
      const filePath = path.join(pPath, f)
      const stat = fs.statSync(filePath)

      sessions.push({
        id:     `claude:${sessionId}`,
        tool:   SOURCES.claude.name,
        icon:   SOURCES.claude.icon,
        sid:    sessionId,
        title:  '',
        time:   stat.mtimeMs,
        project,
        lines:  countLines(filePath),
        file:   filePath
      })
    }
  }

  enrichClaudeTitles(sessions, historyPath)
  return sessions
}

function enrichClaudeTitles(sessions, historyPath) {
  if (!fs.existsSync(historyPath)) return
  const map = {}
  const lines = fs.readFileSync(historyPath, 'utf-8').split('\n')
  for (const line of lines) {
    try {
      const e = JSON.parse(line)
      if (e.sessionId && e.display) map[e.sessionId] = e.display
    } catch {}
  }
  for (const s of sessions) {
    if (map[s.sid]) s.title = map[s.sid]
  }
}

// ─── Codex CLI ───────────────────────────────────────────────────────────────

function scanCodex() {
  const sessions = []
  const hp = path.join(SOURCES.codex.dir, 'history.jsonl')
  if (!fs.existsSync(hp)) return sessions

  const map = new Map()
  const lines = fs.readFileSync(hp, 'utf-8').split('\n')
  for (const line of lines) {
    try {
      const e = JSON.parse(line)
      if (!e.session_id) continue
      if (!map.has(e.session_id)) {
        map.set(e.session_id, {
          id: `codex:${e.session_id}`,
          tool: SOURCES.codex.name,
          icon: SOURCES.codex.icon,
          sid: e.session_id,
          title: e.text || '',
          time: (e.ts || 0) * 1000,
          project: '',
          lines: 1,
          file: hp
        })
      } else {
        const s = map.get(e.session_id)
        s.lines++
        if (!s.title && e.text) s.title = e.text
        if (e.ts && e.ts * 1000 > s.time) s.time = e.ts * 1000
      }
    } catch {}
  }
  return [...map.values()]
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function listSessions() {
  const all = [...scanClaude(), ...scanCodex()]
  all.sort((a, b) => b.time - a.time)
  return all
}

export function getSession(filePath) {
  if (!fs.existsSync(filePath)) return null
  return fs.readFileSync(filePath, 'utf-8')
}

export function deleteSession(session) {
  if (fs.existsSync(session.file)) {
    fs.unlinkSync(session.file)
  }

  if (session.id.startsWith('claude:')) {
    const hp = path.join(SOURCES.claude.dir, 'history.jsonl')
    if (fs.existsSync(hp)) {
      const filtered = fs.readFileSync(hp, 'utf-8')
        .split('\n')
        .filter(l => {
          try { return JSON.parse(l).sessionId !== session.sid }
          catch { return true }
        })
        .join('\n')
      fs.writeFileSync(hp, filtered, 'utf-8')
    }
  }
}

export function exportSessionMd(session) {
  const content = getSession(session.file)
  if (!content) return ''

  const lines = []
  lines.push(`# ${session.title || session.sid}`)
  lines.push(`> ${session.tool} · ${new Date(session.time).toLocaleString()}`)
  if (session.project) lines.push(`> Project: ${session.project}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    try {
      const obj = JSON.parse(line)
      if (obj.type === 'user') {
        const text = obj.message?.content || ''
        if (text) { lines.push(`### 👤 You`); lines.push(''); lines.push(text); lines.push('') }
      } else if (obj.type === 'assistant') {
        const blocks = obj.message?.content || []
        for (const block of blocks) {
          if (block.type === 'text' && block.text) {
            lines.push(`### 🤖 Assistant`); lines.push(''); lines.push(block.text); lines.push('')
          }
        }
      }
    } catch {}
  }
  return lines.join('\n')
}
