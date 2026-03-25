import { Effect } from 'effect';

import { GitProviderRepository } from '../../repositories/git-provider-repository';
import { MediaRepository } from '../../repositories/media-repository';
import { AuthService } from '../auth';
import { MediaOperationError, MediaValidationError } from './media-types';

export const deleteMedia = (mediaId: string, userId: string) =>
  Effect.gen(function* () {
    const mediaRepo = yield* MediaRepository;
    const media = yield* mediaRepo.findById(mediaId);

    if (!media) {
      return yield* new MediaValidationError({
        field: 'id',
        message: 'Media not found',
      });
    }

    if (media.site.userId !== userId) {
      return yield* new MediaValidationError({
        field: 'id',
        message: 'Access denied',
      });
    }

    if (media.site.gitRepo) {
      const authService = yield* AuthService;
      const accessToken = yield* authService.getUserAuthToken(userId);
      const gitProvider = yield* GitProviderRepository;

      yield* gitProvider
        .deleteFileFromRepo(accessToken, media.site.gitRepo, {
          filePath: media.filePath,
          commitMessage: `Delete image: ${media.filename}`,
        })
        .pipe(
          Effect.catchTag('GitProviderError', (error) =>
            Effect.fail(
              new MediaOperationError({
                reason: `Failed to delete from GitHub: ${error.message}`,
              })
            )
          )
        );
    }

    yield* mediaRepo.delete(mediaId);

    return { deleted: true };
  });
