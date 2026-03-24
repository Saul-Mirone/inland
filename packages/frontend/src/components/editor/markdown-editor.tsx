import { Effect } from 'effect';
import { useCallback } from 'react';

import { EditorService } from '@/services/editor';
import { runEffect } from '@/utils/effect-runtime';

export function MarkdownEditor({ className }: { className?: string }) {
  const mountRef = useCallback((el: HTMLDivElement | null) => {
    if (el) {
      const createEditorEffect = Effect.flatMap(EditorService, (svc) =>
        svc.initialize(el)
      );
      void runEffect(createEditorEffect);
    } else {
      const destroyEditorEffect = Effect.flatMap(EditorService, (svc) =>
        svc.destroy()
      );
      void runEffect(destroyEditorEffect);
    }
  }, []);

  return <div ref={mountRef} className={className} />;
}
