import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DialogService, type ConfirmOptions } from '@/services/dialog';
import { runtime } from '@/utils/effect-runtime';
import { useObservable } from '@/utils/use-observable';

const dialogService = runtime.runSync(DialogService);

export function confirm(options: ConfirmOptions): Promise<boolean> {
  return dialogService.confirm(options);
}

export function ConfirmDialog() {
  const state = useObservable(dialogService.state$);

  return (
    <Dialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) dialogService.close(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{state.options.title}</DialogTitle>
          <DialogDescription>{state.options.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {state.options.cancelText ?? 'Cancel'}
          </DialogClose>
          <Button
            variant={state.options.confirmVariant ?? 'default'}
            onClick={() => dialogService.close(true)}
          >
            {state.options.confirmText ?? 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
