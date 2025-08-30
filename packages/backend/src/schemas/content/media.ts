import { Schema as S } from 'effect'

import { Id, Url } from '../common'

// Storage type schemas
export const StorageType = S.Literal('github', 'gitlab', 'external')

export const CreateMediaData = S.Struct({
  siteId: Id,
  filename: S.String.pipe(S.minLength(1)),
  originalName: S.String.pipe(S.minLength(1)),
  filePath: S.String.pipe(S.minLength(1)),
  fileSize: S.BigInt.pipe(
    S.filter((n) => n > 0n, { message: () => 'File size must be positive' })
  ),
  mimeType: S.String.pipe(S.minLength(1)),
  storageType: S.optional(StorageType),
  externalUrl: S.optional(Url),
  alt: S.optional(S.String.pipe(S.maxLength(200))),
})

// Export types
export type StorageType = S.Schema.Type<typeof StorageType>
export type CreateMediaData = S.Schema.Type<typeof CreateMediaData>
