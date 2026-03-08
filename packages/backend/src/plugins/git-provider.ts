import { Layer } from 'effect'

import { GitProviderRepository } from '../repositories/git-provider-repository'
import { makeGitHubApiRepository } from '../repositories/implementations/github-api-repository'
import { resolveConfig } from '../services/config-service'

const config = resolveConfig()

// Layer that provides GitHub implementation
export const GitHubProviderLive = Layer.succeed(
  GitProviderRepository,
  makeGitHubApiRepository({ templateRepo: config.templateRepo })
)

// Default provider (currently GitHub)
export const GitProviderLive = GitHubProviderLive
