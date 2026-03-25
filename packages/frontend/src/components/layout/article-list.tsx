import { Effect } from 'effect';
import {
  FileText,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { confirm } from '@/components/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar';
import { articlesModel } from '@/model/articles-model';
import { sitesModel } from '@/model/sites-model';
import { ArticleService } from '@/services/article';
import { SiteService } from '@/services/site';
import { runEffect } from '@/utils/effect-runtime';
import { fireAndForget } from '@/utils/fire-and-forget';
import { useObservable } from '@/utils/use-observable';

const DROPDOWN_CLOSE_DELAY = 150;

export function ArticleList() {
  const location = useLocation();
  const navigate = useNavigate();
  const articles = useObservable(articlesModel.articles$);
  const articlesLoading = useObservable(articlesModel.loading$);
  const selectedSiteId = useObservable(sitesModel.selectedSiteId$);
  const [syncing, setSyncing] = useState(false);

  const handleSync = () => {
    if (!selectedSiteId || syncing) return;
    setSyncing(true);
    void runEffect(
      Effect.flatMap(SiteService, (svc) => svc.syncArticles(selectedSiteId))
    ).finally(() => setSyncing(false));
  };

  const handleDeleteArticle = (articleId: string, title: string) => {
    setTimeout(async () => {
      const confirmed = await confirm({
        title: 'Delete article',
        description: `Are you sure you want to delete "${title || 'Untitled'}"? This action cannot be undone.`,
        confirmText: 'Delete',
        confirmVariant: 'destructive',
      });
      if (!confirmed) return;
      await runEffect(
        Effect.flatMap(ArticleService, (svc) => svc.deleteArticle(articleId))
      );
      if (location.pathname === `/articles/${articleId}`) {
        fireAndForget(navigate('/'));
      }
    }, DROPDOWN_CLOSE_DELAY);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Articles</SidebarGroupLabel>
      <SidebarGroupAction
        title="Sync from GitHub"
        disabled={syncing}
        onClick={handleSync}
        className="right-10"
      >
        <RefreshCw className={syncing ? 'animate-spin' : ''} />
      </SidebarGroupAction>
      <SidebarGroupAction
        title="New article"
        onClick={() => {
          if (!selectedSiteId) return;
          void runEffect(
            Effect.flatMap(ArticleService, (svc) =>
              Effect.map(svc.quickCreate(selectedSiteId), (articleId) => {
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
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<SidebarMenuAction showOnHover />}
                  >
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start">
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() =>
                        handleDeleteArticle(article.id, article.title)
                      }
                    >
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ))
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
