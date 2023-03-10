import * as process from 'node:process'
import * as path from 'node:path'

export const isWSL = () => !!process.env.WSL_INTEROP

export type TnewinOptions = {
  close?: boolean
  echo?: boolean
  color?: string
  debug?: boolean
  newTab?: boolean
  profile?: string
  resolvedDir?: string
  separate?: boolean
  title?: string
  notitle?: boolean
  workdir?: string
}

const getArguments = (options: TnewinOptions, cmd: string): string => {
  const wtArgs = []
  if (options.newTab) wtArgs.push(isWSL() ? `-w 0` : '--new-tab')

  if (options.profile) wtArgs.push(`--profile "${options.profile}"`)

  if (isWSL()) {
    // title handling
    if (!options.notitle) {
      let title = options.title
      if (!options.title && cmd) {
        // set to last path item + bash cmd while replacing "npm run", "npx " etc
        const lastPathItem = options.resolvedDir.split('/').reverse()[0]
        cmd = ['npm run ', 'npm-run-all ', 'npx '].reduce(
          (acc, replaceMe) =>
            cmd.startsWith(replaceMe) ? acc.slice(replaceMe.length - 1) : acc,
          cmd
        )
        title = `/${lastPathItem}: $ ${cmd.trim()}`
      }
      if (title) wtArgs.push(`--title "${title}" --suppressApplicationTitle`)
    }

    // color
    if (options.color) {
      if (options.color[0] !== '#') options.color = `#${options.color}`

      wtArgs.push(`--tabColor "${options.color}"`)
    }
  } else {
    // Konsole only
    if (!options.close) wtArgs.push(`--hold`)
    if (options.separate) wtArgs.push(`--separate`)
  }

  const argsStr = wtArgs.join(' ')
  return argsStr ? `${argsStr} ` : ``
}

export const getFullCommand = (cmd, options: TnewinOptions): string => {
  if (!options.workdir) options.workdir = '.'

  let fullCommand
  if (isWSL()) {
    const wtBashCmds = [`source /etc/environment`]
    options.resolvedDir = ['/', '~'].includes(options.workdir[0])
      ? options.workdir
      : path.resolve(process.cwd(), options.workdir)

    wtBashCmds.push(`cd "${options.resolvedDir}"`)

    if (cmd) {
      if (options.echo) wtBashCmds.push(`echo '(newin WSL) $ ${cmd}'`)
      wtBashCmds.push(cmd)
    }
    wtBashCmds.push(`exec bash 2>&1`)

    fullCommand = `wt.exe ${getArguments(options, cmd)}bash -c "${wtBashCmds.join(' && ')}"`
  } else {
    // Konsole only
    fullCommand = `konsole ${getArguments(
      options,
      cmd
    )}--show-tabbar --hide-menubar --workdir "${options.workdir}" ${cmd ? '-e ' : ''}"${cmd}" &`
  }

  return fullCommand
}
