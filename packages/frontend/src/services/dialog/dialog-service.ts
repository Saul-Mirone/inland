import type React from 'react';
import type { BehaviorSubject } from 'rxjs';

import { Context } from 'effect';

import type { Button } from '@/components/ui/button';

// ── Types ───────────────────────────────────────────────────────────

export interface ConfirmOptions {
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: React.ComponentProps<typeof Button>['variant'];
}

export interface ConfirmState {
  open: boolean;
  options: ConfirmOptions;
  resolve: ((confirmed: boolean) => void) | null;
}

// ── Service interface ───────────────────────────────────────────────

export interface DialogServiceInterface {
  readonly state$: BehaviorSubject<ConfirmState>;
  readonly confirm: (options: ConfirmOptions) => Promise<boolean>;
  readonly close: (confirmed: boolean) => void;
}

// ── DI tag ──────────────────────────────────────────────────────────

export class DialogService extends Context.Tag('DialogService')<
  DialogService,
  DialogServiceInterface
>() {}
