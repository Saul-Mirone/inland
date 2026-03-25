import { Effect } from 'effect';
import path from 'node:path';

import { GitProviderRepository } from '../../repositories/git-provider-repository';
import { MediaRepository } from '../../repositories/media-repository';
import { validateSiteGitAccess } from '../article/git/validate-site-git-access';
import { IMAGE_MIME_TYPES } from './media-types';

export const importMediaFromGit = (siteId: string, userId: string) =>
  Effect.gen(function* () {
    const { gitRepo, accessToken } = yield* validateSiteGitAccess(
      siteId,
      userId
    );

    const gitProvider = yield* GitProviderRepository;
    const repoInfo = yield* gitProvider.getRepositoryInfo(accessToken, gitRepo);

    const mediaFiles = yield* gitProvider.getMediaFilesFromRepo(
      accessToken,
      gitRepo,
      repoInfo.defaultBranch
    );

    const mediaRepo = yield* MediaRepository;
    let imported = 0;

    for (const file of mediaFiles) {
      const existing = yield* mediaRepo.findBySiteIdAndPath(
        siteId,
        file.filePath
      );

      if (existing) continue;

      const ext = path.extname(file.filename).toLowerCase();

      yield* mediaRepo
        .create({
          siteId,
          filename: file.filename,
          originalName: file.filename,
          filePath: file.filePath,
          fileSize: BigInt(file.size),
          mimeType: IMAGE_MIME_TYPES[ext] ?? 'application/octet-stream',
        })
        .pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              imported++;
            })
          ),
          Effect.catchAll((error) =>
            Effect.logError(`Failed to import media ${file.filePath}:`, {
              error,
            })
          )
        );
    }

    return { imported, total: mediaFiles.length };
  });
