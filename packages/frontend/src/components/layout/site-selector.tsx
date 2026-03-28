import { Effect } from 'effect';
import { ChevronsUpDown, Globe, Plus, Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { confirm } from '@/components/confirm-dialog';
import { CreateSiteDialog } from '@/components/sites/create-site-dialog';
import { SiteSettingsDialog } from '@/components/sites/site-settings-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { sitesModel } from '@/model/sites-model';
import { ArticleService } from '@/services/article';
import { SiteService } from '@/services/site';
import { runEffect } from '@/utils/effect-runtime';
import { useObservable } from '@/utils/use-observable';

export function SiteSelector() {
  const sites = useObservable(sitesModel.sites$);
  const selectedSiteId = useObservable(sitesModel.selectedSiteId$);
  const loading = useObservable(sitesModel.loading$);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { isMobile } = useSidebar();
  const navigate = useNavigate();

  const selectedSite = sites.find((s) => s.id === selectedSiteId);
  const siteLabel =
    selectedSite?.displayName ??
    selectedSite?.name ??
    (loading ? 'Loading...' : 'No sites');

  const handleDeleteSite = async (
    e: React.MouseEvent,
    siteId: string,
    siteName: string
  ) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: 'Delete site',
      description: `Are you sure you want to delete "${siteName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      confirmVariant: 'destructive',
    });
    if (!confirmed) return;

    const isSelected = siteId === selectedSiteId;

    void runEffect(
      Effect.gen(function* () {
        const siteSvc = yield* SiteService;
        const articleSvc = yield* ArticleService;

        if (isSelected) {
          yield* articleSvc.clearArticles();
          void navigate('/');
        }

        yield* siteSvc.deleteSite(siteId);

        if (isSelected) {
          const remaining = sitesModel.sites$.getValue();
          if (remaining.length > 0) {
            yield* siteSvc.selectSite(remaining[0].id);
            yield* articleSvc.fetchArticles(remaining[0].id);
          } else {
            yield* siteSvc.deselectSite();
          }
        }
      })
    );
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  size="lg"
                  className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                />
              }
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Globe className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{siteLabel}</span>
                {selectedSite && (
                  <span className="truncate text-xs">
                    {selectedSite.gitRepo}
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-auto" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-56 rounded-lg"
              align="start"
              side={isMobile ? 'bottom' : 'right'}
              sideOffset={4}
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Sites
                </DropdownMenuLabel>
                {sites.map((site) => (
                  <DropdownMenuItem
                    key={site.id}
                    onClick={() => {
                      void runEffect(
                        Effect.gen(function* () {
                          const articleSvc = yield* ArticleService;
                          yield* articleSvc.selectTag(null);
                          const siteSvc = yield* SiteService;
                          yield* siteSvc.selectSite(site.id);
                          yield* articleSvc.fetchArticles(site.id);
                        })
                      );
                    }}
                    className="group gap-2 p-2"
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border">
                      <Globe className="size-4" />
                    </div>
                    <span className="flex-1 truncate">
                      {site.displayName ?? site.name}
                    </span>
                    <button
                      type="button"
                      className="ml-auto hidden size-6 items-center justify-center rounded-md text-muted-foreground hover:text-destructive group-hover:flex"
                      onClick={(e) =>
                        handleDeleteSite(
                          e,
                          site.id,
                          site.displayName ?? site.name
                        )
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              {selectedSite && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      className="gap-2 p-2"
                      onClick={() => setSettingsOpen(true)}
                    >
                      <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                        <Settings className="size-4" />
                      </div>
                      <span className="font-medium text-muted-foreground">
                        Site settings
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="gap-2 p-2"
                  onClick={() => setDialogOpen(true)}
                >
                  <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                    <Plus className="size-4" />
                  </div>
                  <span className="font-medium text-muted-foreground">
                    Add site
                  </span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <CreateSiteDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <SiteSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
