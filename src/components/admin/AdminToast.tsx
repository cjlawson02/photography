import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { adminClass } from './admin-styles.ts';

type AdminToastItem = {
  id: number;
  message: string;
  undo?: () => void;
};

type PushToastOptions = {
  undo?: () => void;
};

type AdminToastContextValue = {
  pushToast: (message: string, options?: PushToastOptions) => void;
};

const AdminToastContext = createContext<AdminToastContextValue | null>(null);

const TOAST_TTL_MS = 8_000;

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<AdminToastItem[]>([]);
  const nextId = useRef(0);

  const pushToast = useCallback((message: string, options?: PushToastOptions) => {
    const id = ++nextId.current;
    setToasts((current) => [...current, { id, message, undo: options?.undo }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, TOAST_TTL_MS);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <AdminToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 ? (
        <div
          className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2"
          aria-live="polite"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded border px-4 py-3 text-sm shadow-lg ${adminClass.uploadSection} ${adminClass.fg}`}
            >
              <p>{toast.message}</p>
              <div className="mt-2 flex gap-3">
                {toast.undo ? (
                  <button
                    type="button"
                    className={`text-xs font-medium ${adminClass.link}`}
                    onClick={() => {
                      toast.undo?.();
                      dismiss(toast.id);
                    }}
                  >
                    Undo
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`text-xs ${adminClass.linkMuted}`}
                  onClick={() => dismiss(toast.id)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </AdminToastContext.Provider>
  );
}

export function useAdminToast(): AdminToastContextValue {
  const ctx = useContext(AdminToastContext);
  if (!ctx) {
    throw new Error('useAdminToast must be used within AdminToastProvider');
  }
  return ctx;
}
