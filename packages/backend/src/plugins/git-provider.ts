import { Layer } from 'effect'

import { GitProviderRepository } from '../repositories/git-provider-repository'
import { makeGitHubApiRepository } from '../repositories/implementations/github-api-repository'

// Layer that provides GitHub implementation
export const GitHubProviderLive = Layer.succeed(
  GitProviderRepository,
  makeGitHubApiRepository()
)

// Default provider (currently GitHub)
export const GitProviderLive = GitHubProviderLive

// TODO: Add GitLab implementation
// export const GitLabProviderLive = Layer.succeed(
//   GitProviderRepository,
//   makeGitLabApiRepository()
// )

// TODO: Add factory function for dynamic provider selection
// export const makeGitProviderLayer = (platform: 'github' | 'gitlab') => {
//   switch (platform) {
//     case 'github':
//       return GitHubProviderLive
//     case 'gitlab':
//       return GitLabProviderLive
//     default:
//       return GitHubProviderLive
//   }
// }
