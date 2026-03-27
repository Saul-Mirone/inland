import { Effect } from 'effect';
import {
  FileText,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
import {
  articlesModel,
  hasUnpublishedChanges,
  parseTags,
} from '@/model/articles-model';
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
  const selectedTag = useObservable(articlesModel.selectedTag$);
  const selectedSiteId = useObservable(sitesModel.selectedSiteId$);
  const [syncing, setSyncing] = useState(false);

  const filteredArticles = useMemo(() => {
    if (!selectedTag) return articles;
    return articles.filter((article) =>
      parseTags(article.tags).includes(selectedTag)
    );
  }, [articles, selectedTag]);

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
      {selectedTag ? (
        <SidebarGroupLabel className="pr-16">
          <span className="truncate">Tag: {selectedTag}</span>
          <button
            className="ml-auto opacity-50 hover:opacity-100"
            onClick={() =>
              void runEffect(
                Effect.flatMap(ArticleService, (svc) => svc.selectTag(null))
              )
            }
            title="Clear filter"
          >
            <X className="size-3.5" />
          </button>
        </SidebarGroupLabel>
      ) : (
        <SidebarGroupLabel>All Articles</SidebarGroupLabel>
      )}
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
          ) : filteredArticles.length === 0 ? (
            <li className="px-2 py-1.5 text-xs text-sidebar-foreground/50">
              {selectedTag
                ? `No articles tagged "${selectedTag}"`
                : 'No articles yet'}
            </li>
          ) : (
            filteredArticles.map((article) => {
              const unpublished = hasUnpublishedChanges(article);
              return (
                <SidebarMenuItem key={article.id}>
                  <SidebarMenuButton
                    isActive={location.pathname === `/articles/${article.id}`}
                    tooltip={article.title}
                    className={
                      article.status === 'draft' ? 'pr-16!' : undefined
                    }
                    render={<Link to={`/articles/${article.id}`} />}
                    onClick={() => {
                      void runEffect(
                        Effect.flatMap(ArticleService, (svc) =>
                          svc.openArticle(article.id)
                        )
                      );
                    }}
                  >
                    {unpublished ? (
                      <div className="relative">
                        <FileText />
                        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-red-500" />
                      </div>
                    ) : (
                      <FileText />
                    )}
                    <span>{article.title}</span>
                  </SidebarMenuButton>
                  {article.status === 'draft' && (
                    <SidebarMenuBadge className="right-7">
                      draft
                    </SidebarMenuBadge>
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
              );
            })
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
