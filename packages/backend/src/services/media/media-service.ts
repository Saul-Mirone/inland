import { Context } from 'effect';

import type { deleteMedia } from './delete-media';
import type { importMediaFromGit } from './import-media-from-git';
import type { listMedia } from './list-media';
import type { uploadMedia } from './upload-media';

export interface MediaServiceInterface {
  readonly uploadMedia: typeof uploadMedia;
  readonly listMedia: typeof listMedia;
  readonly deleteMedia: typeof deleteMedia;
  readonly importMediaFromGit: typeof importMediaFromGit;
}

export class MediaService extends Context.Tag('MediaService')<
  MediaService,
  MediaServiceInterface
>() {}
