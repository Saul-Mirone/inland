import { FileText, Tag } from 'lucide-react';
import { useState } from 'react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { sitesModel } from '@/model/sites-model';
import { useObservable } from '@/utils/use-observable';

import { ArticleList } from './article-list';
import { SiteSelector } from './site-selector';
import { TagList } from './tag-list';
import { UserMenu } from './user-menu';

export function AppSidebar() {
  const selectedSiteId = useObservable(sitesModel.selectedSiteId$);
  const [tab, setTab] = useState('articles');

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SiteSelector />
      </SidebarHeader>

      <SidebarContent>
        {selectedSiteId ? (
          <Tabs
            value={tab}
            onValueChange={setTab}
            className="flex h-full flex-col"
          >
            <TabsList className="mx-2 w-auto justify-start dark:bg-input/50">
              <TabsTrigger value="articles" title="Articles">
                <FileText className="size-4" />
              </TabsTrigger>
              <TabsTrigger value="tags" title="Tags">
                <Tag className="size-4" />
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="articles"
              className="min-h-0 flex-1 overflow-y-auto"
            >
              <ArticleList />
            </TabsContent>
            <TabsContent
              value="tags"
              className="min-h-0 flex-1 overflow-y-auto"
            >
              <TagList onTagSelect={() => setTab('articles')} />
            </TabsContent>
          </Tabs>
        ) : null}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
