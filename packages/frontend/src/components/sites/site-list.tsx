import { Effect } from 'effect';

import { Button } from '@/components/ui/button';
import { sitesModel } from '@/model/sites-model';
import { SiteService } from '@/services/site';
import { runEffect } from '@/utils/effect-runtime';
import { useObservable } from '@/utils/use-observable';

export const SiteList = () => {
  const sites = useObservable(sitesModel.sites$);
  const loading = useObservable(sitesModel.loading$);
  const error = useObservable(sitesModel.error$);

  const handleDelete = (siteId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this site? This action cannot be undone.'
      )
    ) {
      return;
    }
    void runEffect(
      Effect.flatMap(SiteService, (svc) => svc.deleteSite(siteId))
    );
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Loading sites...</div>
    );
  }

  if (error) {
    return <div className="text-sm text-destructive">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your Sites</h2>
      {sites.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sites yet. Create your first site!
        </p>
      ) : (
        <div className="grid gap-4">
          {sites.map((site) => (
            <div
              key={site.id}
              className="space-y-1 rounded-lg border border-border p-4"
            >
              <h3 className="text-base font-semibold">{site.name}</h3>
              <p className="text-sm text-muted-foreground">
                Repository: {site.gitRepo}
              </p>
              <p className="text-sm text-muted-foreground">
                Platform: {site.platform}
              </p>
              <p className="text-sm text-muted-foreground">
                Status: {site.deployStatus}
              </p>
              <p className="text-sm text-muted-foreground">
                Articles: {site._count.articles}
              </p>
              <p className="text-sm text-muted-foreground">
                Media files: {site._count.media}
              </p>
              <p className="text-sm text-muted-foreground">
                Created: {new Date(site.createdAt).toLocaleDateString()}
              </p>
              <div className="pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(site.id)}
                >
                  Delete Site
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
