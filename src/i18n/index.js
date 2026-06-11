// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2026 jackybig <jacky_big@outlook.com>
import en from '../../locales/en.json' with { type: 'json' }
import zhCN from '../../locales/zh-CN.json' with { type: 'json' }
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const dictionaries = { en, 'zh-CN': zhCN }

// Load extra locale files from disk (for development; embedded mode skips this)
try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const localesDir = path.resolve(__dirname, '../../locales')
  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'))
  for (const file of files) {
    const lang = file.replace('.json', '')
    if (!dictionaries[lang]) {
      dictionaries[lang] = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf-8'))
    }
  }
} catch { /* compiled mode: locales embedded via import, disk read skipped */ }

let currentLang = 'en'

export function setLang(lang) {
  if (dictionaries[lang]) {
    currentLang = lang
  }
}

export function getLang() {
  return currentLang
}

export function t(key, vars = {}) {
  const dict = dictionaries[currentLang] || dictionaries.en || {}
  let text = dict[key]
  if (text === undefined) {
    text = dictionaries.en?.[key] ?? key
  }
  if (typeof text !== 'string') return key
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
  }
  return text
}

export function getDictionary(lang) {
  return dictionaries[lang] || dictionaries.en || {}
}
