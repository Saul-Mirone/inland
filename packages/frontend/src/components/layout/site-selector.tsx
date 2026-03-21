import { ChevronsUpDown, Globe, Plus } from 'lucide-react';
import { useState } from 'react';

import { CreateSiteDialog } from '@/components/sites/create-site-dialog';
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
import { useObservable } from '@/utils/use-observable';

export function SiteSelector() {
  const sites = useObservable(sitesModel.sites$);
  const selectedSiteId = useObservable(sitesModel.selectedSiteId$);
  const loading = useObservable(sitesModel.loading$);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { isMobile } = useSidebar();

  const selectedSite = sites.find((s) => s.id === selectedSiteId);

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
              <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Globe className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {selectedSite?.name ?? (loading ? 'Loading...' : 'No sites')}
                </span>
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
                      sitesModel.selectedSiteId$.next(site.id);
                    }}
                    className="gap-2 p-2"
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border">
                      <Globe className="size-4" />
                    </div>
                    {site.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
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
    </>
  );
}
