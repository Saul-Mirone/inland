import { once } from 'lodash-es'

import { exec } from './exec'

export type PackageItem = {
  name: string
  location: string
  workspaceDependencies: string[]
}

export const yarnList = once(() => {
  const output = exec('', 'yarn workspaces list -v --json', { silent: true })

  let packageList = JSON.parse(
    `[${output.trim().replace(/\r\n|\n/g, ',')}]`
  ) as PackageItem[]

  packageList.forEach((p) => {
    p.location = p.location.replaceAll(/\\/g, '/')

    if ('mismatchedWorkspaceDependencies' in p) {
      delete p['mismatchedWorkspaceDependencies']
    }
  })

  return packageList.filter((p) => p.location !== '.')
})
