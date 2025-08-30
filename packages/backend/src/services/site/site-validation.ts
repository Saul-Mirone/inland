import { Effect } from 'effect'

import { SiteValidationError } from './site-types'

export const validateSiteName = (name: string) =>
  Effect.gen(function* () {
    const trimmedName = name.trim()

    if (trimmedName.length === 0) {
      return yield* new SiteValidationError({
        field: 'name',
        message: 'Site name cannot be empty',
      })
    }

    if (trimmedName.length > 100) {
      return yield* new SiteValidationError({
        field: 'name',
        message: 'Site name cannot exceed 100 characters',
      })
    }

    // Basic slug validation for GitHub repo names
    const validNamePattern = /^[a-zA-Z0-9\-_.]+$/
    if (!validNamePattern.test(trimmedName)) {
      return yield* new SiteValidationError({
        field: 'name',
        message:
          'Site name can only contain letters, numbers, hyphens, underscores, and dots',
      })
    }

    return trimmedName
  })

export const validateGitRepo = (gitRepo: string) =>
  Effect.gen(function* () {
    const trimmedRepo = gitRepo.trim()

    if (trimmedRepo.length === 0) {
      return yield* new SiteValidationError({
        field: 'gitRepo',
        message: 'Git repository cannot be empty',
      })
    }

    // Basic validation for GitHub repo format: username/repo-name
    const repoPattern = /^[a-zA-Z0-9\-_.]+\/[a-zA-Z0-9\-_.]+$/
    if (!repoPattern.test(trimmedRepo)) {
      return yield* new SiteValidationError({
        field: 'gitRepo',
        message: 'Git repository must be in format: username/repository-name',
      })
    }

    return trimmedRepo
  })
