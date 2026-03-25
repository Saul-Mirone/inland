import { Effect } from 'effect';
import { ImageIcon, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { authModel } from '@/model/auth-model';
import { sitesModel } from '@/model/sites-model';
import { AuthService } from '@/services/auth';
import { MediaService } from '@/services/media';
import { runEffect } from '@/utils/effect-runtime';
import { fireAndForget } from '@/utils/fire-and-forget';
import { useObservable } from '@/utils/use-observable';

export function UserMenu() {
  const navigate = useNavigate();
  const authState = useObservable(authModel.authState$);
  const selectedSiteId = useObservable(sitesModel.selectedSiteId$);
  const user = authState.user;

  if (!user) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName ?? user.username}
                className="size-6 rounded-full"
              />
            ) : (
              <div className="flex size-6 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium">
                {(user.displayName ?? user.username).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium">
                {user.displayName ?? user.username}
              </span>
              {user.email && (
                <span className="truncate text-xs text-sidebar-foreground/60">
                  {user.email}
                </span>
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-[--radix-dropdown-menu-trigger-width]"
          >
            <DropdownMenuItem
              onClick={() => {
                if (selectedSiteId) {
                  void runEffect(
                    Effect.flatMap(MediaService, (svc) =>
                      svc.fetchMedia(selectedSiteId)
                    )
                  );
                }
                fireAndForget(navigate('/media'));
              }}
            >
              <ImageIcon />
              Media
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                void runEffect(Effect.flatMap(AuthService, (s) => s.logout()));
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
