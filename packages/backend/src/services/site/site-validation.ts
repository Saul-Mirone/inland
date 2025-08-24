import { Effect } from 'effect'

export const validateSiteName = (name: string) =>
  Effect.gen(function* () {
    const trimmedName = name.trim()

    if (trimmedName.length === 0) {
      return yield* Effect.fail('Site name cannot be empty')
    }

    if (trimmedName.length > 100) {
      return yield* Effect.fail('Site name cannot exceed 100 characters')
    }

    // Basic slug validation for GitHub repo names
    const validNamePattern = /^[a-zA-Z0-9\-_.]+$/
    if (!validNamePattern.test(trimmedName)) {
      return yield* Effect.fail(
        'Site name can only contain letters, numbers, hyphens, underscores, and dots'
      )
    }

    return trimmedName
  })

export const validateGitRepo = (gitRepo: string) =>
  Effect.gen(function* () {
    const trimmedRepo = gitRepo.trim()

    if (trimmedRepo.length === 0) {
      return yield* Effect.fail('Git repository cannot be empty')
    }

    // Basic validation for GitHub repo format: username/repo-name
    const repoPattern = /^[a-zA-Z0-9\-_.]+\/[a-zA-Z0-9\-_.]+$/
    if (!repoPattern.test(trimmedRepo)) {
      return yield* Effect.fail(
        'Git repository must be in format: username/repository-name'
      )
    }

    return trimmedRepo
  })
