import { Effect } from 'effect';
import { FileText, LayoutDashboard, LogOut, Plus } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { articlesModel } from '@/model/articles-model';
import { authModel } from '@/model/auth-model';
import { sitesModel } from '@/model/sites-model';
import { ArticleService } from '@/services/article';
import { AuthService } from '@/services/auth';
import { runEffect } from '@/utils/effect-runtime';
import { fireAndForget } from '@/utils/fire-and-forget';
import { useObservable } from '@/utils/use-observable';

import { SiteSelector } from './site-selector';

const navItems = [{ path: '/', label: 'Dashboard', icon: LayoutDashboard }];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const authState = useObservable(authModel.authState$);
  const articles = useObservable(articlesModel.articles$);
  const articlesLoading = useObservable(articlesModel.loading$);
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

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Articles</SidebarGroupLabel>
          <SidebarGroupAction
            title="New article"
            onClick={() => {
              const siteId = sitesModel.selectedSiteId$.getValue();
              if (!siteId) return;
              void runEffect(
                Effect.flatMap(ArticleService, (svc) =>
                  Effect.map(svc.quickCreate(siteId), (articleId) => {
                    if (articleId) {
                      fireAndForget(navigate(`/articles/${articleId}`));
                    }
                  })
                )
              );
            }}
          >
            <Plus />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {articlesLoading ? (
                <>
                  <SidebarMenuSkeleton />
                  <SidebarMenuSkeleton />
                  <SidebarMenuSkeleton />
                </>
              ) : articles.length === 0 ? (
                <li className="px-2 py-1.5 text-xs text-sidebar-foreground/50">
                  No articles yet
                </li>
              ) : (
                articles.map((article) => (
                  <SidebarMenuItem key={article.id}>
                    <SidebarMenuButton
                      isActive={location.pathname === `/articles/${article.id}`}
                      tooltip={article.title}
                      render={<Link to={`/articles/${article.id}`} />}
                      onClick={() => {
                        void runEffect(
                          Effect.flatMap(ArticleService, (svc) =>
                            svc.openArticle(article.id)
                          )
                        );
                      }}
                    >
                      <FileText />
                      <span>{article.title}</span>
                    </SidebarMenuButton>
                    {article.status === 'draft' && (
                      <SidebarMenuBadge>draft</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))
              )}
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
