import { Effect } from 'effect';
import { Moon, Sun } from 'lucide-react';
import { Outlet } from 'react-router';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { themeModel } from '@/model/theme-model';
import { ThemeService } from '@/services/theme';
import { runEffect } from '@/utils/effect-runtime';
import { useObservable } from '@/utils/use-observable';

import { AppSidebar } from './sidebar';

export function AppLayout() {
  const effectiveTheme = useObservable(themeModel.effectiveTheme$);
  const isDark = effectiveTheme === 'dark';

  const handleToggleTheme = () => {
    void runEffect(Effect.flatMap(ThemeService, (svc) => svc.toggle()));
  };

  return (
    <SidebarProvider className="h-svh">
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleToggleTheme}
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            <span className="sr-only">
              {isDark ? 'Light mode' : 'Dark mode'}
            </span>
          </Button>
        </header>
        <div className="flex flex-1 overflow-y-auto py-6">
          <div className="mx-auto flex max-w-4xl flex-1 flex-col">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
      <ConfirmDialog />
    </SidebarProvider>
  );
}
