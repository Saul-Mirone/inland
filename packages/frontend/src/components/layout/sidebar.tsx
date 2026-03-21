import { Effect } from 'effect';
import { FileText, LayoutDashboard, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { authModel } from '@/model/auth-model';
import { AuthService } from '@/services/auth';
import { runEffect } from '@/utils/effect-runtime';
import { useObservable } from '@/utils/use-observable';

import { SiteSelector } from './site-selector';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/articles', label: 'Articles', icon: FileText },
];

export function AppSidebar() {
  const location = useLocation();
  const authState = useObservable(authModel.authState$);
  const user = authState.user;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SiteSelector />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path);

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={<Link to={item.path} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" render={<div />}>
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="size-6 rounded-full"
                  />
                ) : (
                  <div className="flex size-6 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-medium">
                    {user.username}
                  </span>
                  {user.email && (
                    <span className="truncate text-xs text-sidebar-foreground/60">
                      {user.email}
                    </span>
                  )}
                </div>
              </SidebarMenuButton>
              <SidebarMenuAction
                onClick={() => {
                  void runEffect(
                    Effect.flatMap(AuthService, (s) => s.logout())
                  );
                }}
                className="top-2.5 hover:text-destructive"
                title="Logout"
              >
                <LogOut />
              </SidebarMenuAction>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
