import { Data } from 'effect';

export class MediaOperationError extends Data.TaggedError(
  'MediaOperationError'
)<{
  readonly reason: string;
}> {}

export class MediaValidationError extends Data.TaggedError(
  'MediaValidationError'
)<{
  readonly field: string;
  readonly message: string;
}> {}

export interface UploadMediaData {
  readonly siteId: string;
  readonly userId: string;
  readonly filename: string;
  readonly buffer: Buffer;
  readonly mimeType: string;
  readonly alt?: string;
}

export interface UploadMediaResult {
  readonly id: string;
  readonly filePath: string;
  readonly url: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const IMAGE_MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
};

const ALLOWED_MIME_TYPES = new Set(Object.values(IMAGE_MIME_TYPES));

export const isAllowedMimeType = (mimeType: string): boolean =>
  ALLOWED_MIME_TYPES.has(mimeType);

export const isWithinSizeLimit = (size: number): boolean =>
  size <= MAX_FILE_SIZE;
