import { BehaviorSubject } from 'rxjs';

import type {
  ConfirmOptions,
  ConfirmState,
  DialogServiceInterface,
} from './dialog-service';

const defaultState: ConfirmState = {
  open: false,
  options: { title: '', description: '' },
  resolve: null,
};

export class DialogServiceImpl implements DialogServiceInterface {
  readonly state$ = new BehaviorSubject<ConfirmState>(defaultState);

  confirm = (options: ConfirmOptions): Promise<boolean> =>
    new Promise((resolve) => {
      const prev = this.state$.getValue();
      prev.resolve?.(false);
      this.state$.next({ open: true, options, resolve });
    });

  close = (confirmed: boolean): void => {
    const state = this.state$.getValue();
    state.resolve?.(confirmed);
    this.state$.next(defaultState);
  };
}
