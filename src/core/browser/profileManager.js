// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2026 jackybig <jacky_big@outlook.com>
import fs from 'fs'
import path from 'path'
import os from 'os'
import logger from '../utils/logger.js'

const BASE_DIR = path.join(os.tmpdir(), 'ai-runtime-manager', 'profiles')

/**
 * Create a profile directory for browser isolation.
 * @param {string} name - Profile name
 * @returns {string} Full path to the profile directory
 */
export function createProfileDir(name) {
  const dir = path.join(BASE_DIR, name)
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      logger.info(`Created profile directory: ${dir}`)
    }
  } catch (err) {
    logger.error(`Failed to create profile directory: ${err.message}`)
    throw err
  }
  return dir
}

/**
 * Get the full path for a named profile.
 * @param {string} name
 * @returns {string}
 */
export function getProfileDir(name) {
  return path.join(BASE_DIR, name)
}

/**
 * Remove a profile directory and all its contents.
 * @param {string} name
 * @returns {boolean}
 */
export function cleanupProfile(name) {
  const dir = getProfileDir(name)
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true })
      logger.info(`Cleaned up profile: ${name}`)
      return true
    }
  } catch (err) {
    logger.error(`Failed to cleanup profile ${name}: ${err.message}`)
  }
  return false
}

/**
 * List all existing profiles.
 * @returns {string[]} Profile names
 */
export function listProfiles() {
  try {
    if (!fs.existsSync(BASE_DIR)) {
      return []
    }
    return fs.readdirSync(BASE_DIR).filter((name) => {
      const stat = fs.statSync(path.join(BASE_DIR, name))
      return stat.isDirectory()
    })
  } catch (err) {
    logger.error(`Failed to list profiles: ${err.message}`)
    return []
  }
}
