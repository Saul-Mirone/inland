import { Layer } from 'effect';

import { deleteMedia } from './delete-media';
import { importMediaFromGit } from './import-media-from-git';
import { listMedia } from './list-media';
import { MediaService } from './media-service';
import { uploadMedia } from './upload-media';

export const MediaServiceLive = Layer.succeed(MediaService, {
  uploadMedia,
  listMedia,
  deleteMedia,
  importMediaFromGit,
});
