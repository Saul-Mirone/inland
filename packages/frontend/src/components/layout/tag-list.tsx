import { Effect } from 'effect';
import { Tag } from 'lucide-react';
import { useMemo } from 'react';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { articlesModel, parseTags } from '@/model/articles-model';
import { ArticleService } from '@/services/article';
import { runEffect } from '@/utils/effect-runtime';
import { useObservable } from '@/utils/use-observable';

interface TagCount {
  name: string;
  count: number;
}

interface TagListProps {
  onTagSelect?: () => void;
}

export function TagList({ onTagSelect }: TagListProps) {
  const articles = useObservable(articlesModel.articles$);
  const selectedTag = useObservable(articlesModel.selectedTag$);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const article of articles) {
      for (const tag of parseTags(article.tags)) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    const result: TagCount[] = [];
    for (const [name, count] of counts) {
      result.push({ name, count });
    }
    return result.toSorted((a, b) => b.count - a.count);
  }, [articles]);

  if (tagCounts.length === 0) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <p className="px-2 py-1.5 text-xs text-sidebar-foreground/50">
            No tags yet
          </p>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  const handleTagClick = (tag: string) => {
    const next = selectedTag === tag ? null : tag;
    void runEffect(
      Effect.flatMap(ArticleService, (svc) => svc.selectTag(next))
    );
    if (next && onTagSelect) {
      onTagSelect();
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>All Tags</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {tagCounts.map((tag) => (
            <SidebarMenuItem key={tag.name}>
              <SidebarMenuButton
                isActive={selectedTag === tag.name}
                onClick={() => handleTagClick(tag.name)}
                tooltip={`${tag.name} (${tag.count})`}
              >
                <Tag className="size-4" />
                <span className="truncate">{tag.name}</span>
                <span className="ml-auto text-xs text-sidebar-foreground/50">
                  {tag.count}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
