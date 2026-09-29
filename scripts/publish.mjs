#!/usr/bin/env node
// Publish the vplan CLI (plus the visual-plan agent skill) to npm under a scope.
//
//   [NPM_TOKEN=...] node scripts/publish.mjs [--version 0.1.0] [--scope @openplatestudio] [--tag latest] [--dry-run]
//
// Builds a self-contained staging copy in .publish/ (dist, vendored runtime + core, README, LICENSE,
// skills/) with the package renamed to <scope>/vplan and workspace-only devDependencies removed, then
// runs `npm publish` from it. The repo's own package.json is never modified, and the token is only
// written to the git-ignored staging dir (removed afterwards).
import { spawnSync } from 'node:child_process'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const cli = join(root, 'packages', 'cli')
const stage = join(root, '.publish')

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const dryRun = process.argv.includes('--dry-run')
const scope = arg('scope', '@openplatestudio')
const tag = arg('tag', 'latest')
// Auth: NPM_TOKEN (granular, bypass-2FA) if set, else the current `npm login` session. NPM_OTP passes a
// one-time code if npm asks for one.
const token = process.env.NPM_TOKEN
const otp = process.env.NPM_OTP

function run(cmd, args, cwd = root) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed (${r.status})`)
  }
}

// vendor.mjs filters with '/' paths, which never match on Windows, so it leaves node_modules, tests and
// config files in cli/runtime. Drop them here, with separator-safe matching, so the tarball is clean.
const runtimeDir = join(cli, 'runtime')
function runtimeFilter(src) {
  const parts = relative(runtimeDir, src).split(sep)
  if (parts[0] === 'node_modules' || parts[0] === 'tests') {
    return false
  }
  return (
    parts.length !== 1 ||
    !/^(package.json|tsconfig.json|vitest.config.ts|AGENTS.md)$/.test(parts[0])
  )
}

const pkg = JSON.parse(await readFile(join(cli, 'package.json'), 'utf8'))
const version = arg('version', pkg.version)

try {
  console.log('Building and vendoring...')
  run('pnpm', ['--filter', 'vplan', 'vendor'])
  run('pnpm', ['--filter', 'vplan', 'build'])

  await rm(stage, { recursive: true, force: true })
  await mkdir(stage, { recursive: true })
  for (const entry of ['dist', 'runtime', 'core', 'README.md', 'LICENSE']) {
    await cp(join(cli, entry), join(stage, entry), {
      recursive: true,
      filter: entry === 'runtime' ? runtimeFilter : undefined,
    })
  }
  await cp(join(root, 'skills'), join(stage, 'skills'), { recursive: true })

  const { devDependencies: _dev, scripts: _scripts, ...rest } = pkg
  const staged = {
    ...rest,
    name: `${scope}/vplan`,
    version,
    files: [...pkg.files, 'skills'],
    publishConfig: { access: 'public' },
  }
  await writeFile(join(stage, 'package.json'), `${JSON.stringify(staged, null, 2)}\n`)
  if (token) {
    await writeFile(join(stage, '.npmrc'), `//registry.npmjs.org/:_authToken=${token}\n`)
  }

  console.log(`Publishing ${staged.name}@${version} (tag ${tag})${dryRun ? ' [dry run]' : ''}...`)
  run(
    'npm',
    [
      'publish',
      '--access',
      'public',
      '--tag',
      tag,
      ...(otp ? ['--otp', otp] : []),
      ...(dryRun ? ['--dry-run'] : []),
    ],
    stage,
  )
} finally {
  await rm(stage, { recursive: true, force: true })
}
