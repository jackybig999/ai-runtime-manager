// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2026 jackybig <jacky_big@outlook.com>
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localesDir = path.resolve(__dirname, '../../locales')

const dictionaries = {}

function loadLocales() {
  try {
    const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'))
    for (const file of files) {
      const lang = file.replace('.json', '')
      const content = fs.readFileSync(path.join(localesDir, file), 'utf-8')
      dictionaries[lang] = JSON.parse(content)
    }
  } catch (err) {
    console.error('Failed to load locales:', err.message)
  }
}

loadLocales()

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
