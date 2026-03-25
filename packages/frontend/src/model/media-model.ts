import { Context, Layer } from 'effect';
import { BehaviorSubject } from 'rxjs';

export interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  fileSize: string;
  mimeType: string;
  alt: string | null;
  createdAt: string;
}

export interface MediaModelService {
  readonly media$: BehaviorSubject<MediaItem[]>;
  readonly loading$: BehaviorSubject<boolean>;
  readonly error$: BehaviorSubject<string | null>;
  readonly total$: BehaviorSubject<number>;
}

const instance: MediaModelService = {
  media$: new BehaviorSubject<MediaItem[]>([]),
  loading$: new BehaviorSubject(false),
  error$: new BehaviorSubject<string | null>(null),
  total$: new BehaviorSubject(0),
};

export class MediaModel extends Context.Tag('MediaModel')<
  MediaModel,
  MediaModelService
>() {}

export const MediaModelLive = Layer.succeed(MediaModel, instance);

export const mediaModel = instance;
