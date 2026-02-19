import type { CircleBoxErrorHookConfig } from './types';

type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;
type RejectionHandler = (event: unknown) => unknown;

type ErrorUtilsLike = {
  getGlobalHandler?: () => GlobalErrorHandler;
  setGlobalHandler?: (handler: GlobalErrorHandler) => void;
};

type BreadcrumbSink = (message: string, attrs: Record<string, string>) => Promise<void>;

let installed = false;
let previousGlobalHandler: GlobalErrorHandler | undefined;
let previousOnUnhandledRejection: RejectionHandler | undefined;
let rejectionCleanup: (() => void) | undefined;

function record(
  sink: BreadcrumbSink,
  origin: string,
  error: unknown,
  stack?: string,
  extras?: Record<string, string>,
): void {
  const attrs: Record<string, string> = {
    origin,
    error_type: typeof error,
    error: String(error),
    ...(stack ? { stack } : {}),
    ...(extras ?? {}),
  };

  void sink('react_native_exception', attrs).catch(() => {
    // Error hooks must never throw into host app code paths.
  });
}

export function installReactNativeErrorHooks(
  sink: BreadcrumbSink,
  config: CircleBoxErrorHookConfig = {},
): void {
  if (installed) {
    return;
  }
  installed = true;

  const captureJsExceptions = config.captureJsExceptions ?? true;
  const captureUnhandledRejections = config.captureUnhandledRejections ?? true;
  const globalAny = globalThis as Record<string, unknown>;

  if (captureJsExceptions) {
    const errorUtils = globalAny.ErrorUtils as ErrorUtilsLike | undefined;
    if (errorUtils?.setGlobalHandler) {
      previousGlobalHandler = errorUtils.getGlobalHandler?.();
      errorUtils.setGlobalHandler((error, isFatal) => {
        const stack = error instanceof Error ? error.stack : undefined;
        record(sink, 'react_native_global', error, stack, {
          fatal: String(Boolean(isFatal)),
        });
        previousGlobalHandler?.(error, isFatal);
      });
    }
  }

  if (captureUnhandledRejections) {
    const addEventListener = globalAny.addEventListener;
    if (typeof addEventListener === 'function') {
      const listener = (event: unknown) => {
        const reason = (event as { reason?: unknown })?.reason;
        const stack = reason instanceof Error ? reason.stack : undefined;
        record(sink, 'react_native_unhandled_rejection', reason ?? event, stack);
      };

      (addEventListener as (name: string, listener: (event: unknown) => void) => void)(
        'unhandledrejection',
        listener,
      );

      const removeEventListener = globalAny.removeEventListener;
      rejectionCleanup = () => {
        if (typeof removeEventListener === 'function') {
          (removeEventListener as (name: string, listener: (event: unknown) => void) => void)(
            'unhandledrejection',
            listener,
          );
        }
      };
    } else if ('onunhandledrejection' in globalAny) {
      previousOnUnhandledRejection = globalAny.onunhandledrejection as RejectionHandler | undefined;
      globalAny.onunhandledrejection = (event: unknown) => {
        const reason = (event as { reason?: unknown })?.reason;
        const stack = reason instanceof Error ? reason.stack : undefined;
        record(sink, 'react_native_unhandled_rejection', reason ?? event, stack);

        if (previousOnUnhandledRejection) {
          return previousOnUnhandledRejection(event);
        }
        return undefined;
      };

      rejectionCleanup = () => {
        globalAny.onunhandledrejection = previousOnUnhandledRejection;
      };
    }
  }
}

export function uninstallReactNativeErrorHooks(): void {
  if (!installed) {
    return;
  }

  const globalAny = globalThis as Record<string, unknown>;
  const errorUtils = globalAny.ErrorUtils as ErrorUtilsLike | undefined;
  if (errorUtils?.setGlobalHandler && previousGlobalHandler) {
    errorUtils.setGlobalHandler(previousGlobalHandler);
  }

  rejectionCleanup?.();

  previousGlobalHandler = undefined;
  previousOnUnhandledRejection = undefined;
  rejectionCleanup = undefined;
  installed = false;
}
