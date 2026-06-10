// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2026 jackybig <jacky_big@outlook.com>
import { launchTool } from './launchTool.js'

/**
 * Launch Claude Code with proxy environment.
 * @param {{protocol:string,host:string,port:number}} proxy
 * @param {object} [options={}]
 * @returns {object} Child process info
 */
export async function launchClaude(proxy, options = {}) {
  return launchTool('claude', proxy, options)
}
