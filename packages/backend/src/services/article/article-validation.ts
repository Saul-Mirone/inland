import { Effect } from 'effect'

import { ArticleValidationError } from './article-types'

export const validateTitle = (title: string) =>
  Effect.gen(function* () {
    const trimmedTitle = title.trim()
    if (trimmedTitle.length === 0) {
      return yield* new ArticleValidationError({
        field: 'title',
        message: 'Article title cannot be empty',
      })
    }
    if (trimmedTitle.length > 200) {
      return yield* new ArticleValidationError({
        field: 'title',
        message: 'Article title cannot exceed 200 characters',
      })
    }
    return trimmedTitle
  })

export const validateSlug = (slug: string) =>
  Effect.gen(function* () {
    const trimmedSlug = slug.trim()
    if (trimmedSlug.length === 0) {
      return yield* new ArticleValidationError({
        field: 'slug',
        message: 'Article slug cannot be empty',
      })
    }
    // Basic slug validation - URL safe characters
    const validSlugPattern = /^[a-z0-9-]+$/
    if (!validSlugPattern.test(trimmedSlug)) {
      return yield* new ArticleValidationError({
        field: 'slug',
        message:
          'Article slug can only contain lowercase letters, numbers, and hyphens',
      })
    }
    if (trimmedSlug.length > 100) {
      return yield* new ArticleValidationError({
        field: 'slug',
        message: 'Article slug cannot exceed 100 characters',
      })
    }
    return trimmedSlug
  })

export const generateSlugFromTitle = (title: string) =>
  Effect.gen(function* () {
    const trimmedTitle = title.trim()
    if (trimmedTitle.length === 0) {
      return yield* new ArticleValidationError({
        field: 'title',
        message: 'Cannot generate slug from empty title',
      })
    }
    // Convert title to URL-friendly slug
    const slug = trimmedTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 100) // Limit length

    if (slug.length === 0) {
      return yield* new ArticleValidationError({
        field: 'title',
        message: 'Title contains no valid slug characters',
      })
    }

    return slug
  })
