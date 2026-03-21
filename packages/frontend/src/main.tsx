import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { Toaster } from 'sonner';

import { TooltipProvider } from '@/components/ui/tooltip';

import { AppRouter } from './router';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TooltipProvider>
        <AppRouter />
        <Toaster richColors />
      </TooltipProvider>
    </BrowserRouter>
  </StrictMode>
);
