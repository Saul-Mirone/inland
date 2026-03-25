import { Effect } from 'effect';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';

import { GitProviderRepository } from '../../repositories/git-provider-repository';
import { MediaRepository } from '../../repositories/media-repository';
import { validateSiteGitAccess } from '../article/git/validate-site-git-access';
import {
  type UploadMediaData,
  type UploadMediaResult,
  MediaOperationError,
  MediaValidationError,
  isAllowedMimeType,
  isWithinSizeLimit,
} from './media-types';

const generateUniqueFilename = (originalName: string): string => {
  const ext = path.extname(originalName).toLowerCase();
  const base = path
    .basename(originalName, ext)
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
  const suffix = randomBytes(4).toString('hex');
  return `${base}-${suffix}${ext}`;
};

const computeHash = (buffer: Buffer): string =>
  createHash('sha256').update(buffer).digest('hex');

export const uploadMedia = (data: UploadMediaData) =>
  Effect.gen(function* () {
    if (!isAllowedMimeType(data.mimeType)) {
      return yield* new MediaValidationError({
        field: 'file',
        message: `Unsupported file type: ${data.mimeType}`,
      });
    }

    if (!isWithinSizeLimit(data.buffer.length)) {
      return yield* new MediaValidationError({
        field: 'file',
        message: 'File size exceeds 10 MB limit',
      });
    }

    const { site, gitRepo, accessToken } = yield* validateSiteGitAccess(
      data.siteId,
      data.userId
    );

    const contentHash = computeHash(data.buffer);
    const mediaRepo = yield* MediaRepository;

    const existing = yield* mediaRepo.findBySiteIdAndHash(site.id, contentHash);

    if (existing) {
      const rawUrl = `https://raw.githubusercontent.com/${gitRepo}/main/${existing.filePath}`;
      return {
        id: existing.id,
        filePath: existing.filePath,
        url: rawUrl,
      } satisfies UploadMediaResult;
    }

    const filename = generateUniqueFilename(data.filename);
    const filePath = `assets/images/${filename}`;
    const base64Content = data.buffer.toString('base64');

    const gitProvider = yield* GitProviderRepository;
    const result = yield* gitProvider
      .uploadFileToRepo(accessToken, gitRepo, {
        filePath,
        base64Content,
        commitMessage: `Upload image: ${filename}`,
      })
      .pipe(
        Effect.catchTag('GitProviderError', (error) =>
          Effect.fail(
            new MediaOperationError({
              reason: error.message,
            })
          )
        )
      );

    const media = yield* mediaRepo.create({
      siteId: site.id,
      filename,
      originalName: data.filename,
      filePath,
      fileSize: BigInt(data.buffer.length),
      mimeType: data.mimeType,
      contentHash,
      alt: data.alt,
    });

    const rawUrl = `https://raw.githubusercontent.com/${gitRepo}/main/${filePath}`;

    return {
      id: media.id,
      filePath: result.filePath,
      url: rawUrl,
    } satisfies UploadMediaResult;
  });
