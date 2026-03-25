import { Effect } from 'effect';
import { ImageIcon, Trash2 } from 'lucide-react';
import { useMemo } from 'react';

import { confirm } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { mediaModel } from '@/model/media-model';
import { sitesModel } from '@/model/sites-model';
import { MediaService } from '@/services/media';
import { runEffect } from '@/utils/effect-runtime';
import { useObservable } from '@/utils/use-observable';

function formatFileSize(sizeStr: string): string {
  const bytes = Number(sizeStr);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildRawGitHubUrl(gitRepo: string, filePath: string): string {
  return `https://raw.githubusercontent.com/${gitRepo}/main/${filePath}`;
}

export function MediaPage() {
  const media = useObservable(mediaModel.media$);
  const loading = useObservable(mediaModel.loading$);
  const selectedSiteId = useObservable(sitesModel.selectedSiteId$);
  const sites = useObservable(sitesModel.sites$);

  const currentGitRepo = useMemo(
    () => sites.find((s) => s.id === selectedSiteId)?.gitRepo,
    [sites, selectedSiteId]
  );

  const handleDelete = async (id: string, filename: string) => {
    const confirmed = await confirm({
      title: 'Delete image',
      description: `Are you sure you want to delete "${filename}"? This will also remove it from the GitHub repository.`,
      confirmText: 'Delete',
      confirmVariant: 'destructive',
    });
    if (!confirmed) return;

    await runEffect(Effect.flatMap(MediaService, (svc) => svc.deleteMedia(id)));
  };

  const handleCopyUrl = (filePath: string) => {
    if (!currentGitRepo) return;
    void navigator.clipboard.writeText(
      buildRawGitHubUrl(currentGitRepo, filePath)
    );
  };

  if (loading) {
    return (
      <div className="px-6 text-sm text-muted-foreground">Loading media...</div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <ImageIcon className="mx-auto size-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">
            No images uploaded yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Paste or drag images into the article editor to upload.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6">
      <h1 className="text-lg font-semibold text-foreground">Media</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {media.length} image{media.length !== 1 ? 's' : ''}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {media.map((item) => (
          <div
            key={item.id}
            className="group relative overflow-hidden rounded-lg border bg-muted/30"
          >
            <button
              type="button"
              className="block w-full"
              onClick={() => handleCopyUrl(item.filePath)}
              title="Copy image URL"
            >
              <div className="aspect-square">
                {item.mimeType.startsWith('image/') && currentGitRepo ? (
                  <img
                    src={buildRawGitHubUrl(currentGitRepo, item.filePath)}
                    alt={item.alt ?? item.originalName}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <ImageIcon className="size-8 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            </button>

            <div className="border-t p-2">
              <p
                className="truncate text-xs font-medium"
                title={item.originalName}
              >
                {item.originalName}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(item.fileSize)}
              </p>
            </div>

            <Button
              variant="destructive"
              size="icon"
              className="absolute right-1.5 top-1.5 size-7 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => handleDelete(item.id, item.originalName)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
