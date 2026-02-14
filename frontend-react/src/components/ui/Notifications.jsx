import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const NotificationsContext = createContext(null);

const toastStyles = {
  success: 'border-emerald-500 bg-emerald-50 text-emerald-900',
  error: 'border-red-500 bg-red-50 text-red-900',
  warning: 'border-amber-500 bg-amber-50 text-amber-900',
  info: 'border-sky-500 bg-sky-50 text-sky-900',
};

export const NotificationsProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [promptState, setPromptState] = useState(null);
  const confirmResolver = useRef(null);
  const promptResolver = useRef(null);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((options) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const toast = {
      id,
      type: options?.type || 'info',
      title: options?.title || '',
      message: options?.message || '',
      duration: typeof options?.duration === 'number' ? options.duration : 4000,
    };
    setToasts((prev) => [...prev, toast]);
    if (toast.duration > 0) {
      setTimeout(() => removeToast(id), toast.duration);
    }
    return id;
  }, [removeToast]);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      confirmResolver.current = resolve;
      setConfirmState({
        title: options?.title || 'Confirmação',
        message: options?.message || '',
        confirmLabel: options?.confirmLabel || 'Confirmar',
        cancelLabel: options?.cancelLabel || 'Cancelar',
        tone: options?.tone || 'warning',
      });
    });
  }, []);

  const prompt = useCallback((options) => {
    return new Promise((resolve) => {
      promptResolver.current = resolve;
      setPromptState({
        title: options?.title || 'Informe o motivo',
        message: options?.message || '',
        confirmLabel: options?.confirmLabel || 'Confirmar',
        cancelLabel: options?.cancelLabel || 'Cancelar',
        placeholder: options?.placeholder || '',
        value: options?.initialValue || '',
        tone: options?.tone || 'warning',
      });
    });
  }, []);

  const handleConfirm = (result) => {
    if (confirmResolver.current) {
      confirmResolver.current(result);
      confirmResolver.current = null;
    }
    setConfirmState(null);
  };

  const handlePrompt = (result) => {
    if (promptResolver.current) {
      promptResolver.current(result);
      promptResolver.current = null;
    }
    setPromptState(null);
  };

  const contextValue = useMemo(() => ({ notify, confirm, prompt }), [notify, confirm, prompt]);

  return (
    <NotificationsContext.Provider value={contextValue}>
      {children}

      <div className="fixed top-5 right-5 z-[1000] flex w-[320px] max-w-[90vw] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-xl border-l-4 px-3 py-2 shadow-md ${toastStyles[toast.type] || toastStyles.info}`}
            role="status"
          >
            {toast.title && <div className="text-xs font-semibold">{toast.title}</div>}
            <div className="text-sm leading-snug">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600"
            >
              Fechar
            </button>
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">{confirmState.title}</h3>
              {confirmState.message && (
                <p className="mt-2 text-sm text-slate-600">{confirmState.message}</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4">
              <button
                onClick={() => handleConfirm(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {confirmState.cancelLabel}
              </button>
              <button
                onClick={() => handleConfirm(true)}
                className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700"
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {promptState && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">{promptState.title}</h3>
              {promptState.message && (
                <p className="mt-2 text-sm text-slate-600">{promptState.message}</p>
              )}
            </div>
            <div className="px-5 py-4">
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                placeholder={promptState.placeholder}
                value={promptState.value}
                onChange={(event) => setPromptState((prev) => ({ ...prev, value: event.target.value }))}
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-5 pb-5">
              <button
                onClick={() => handlePrompt(null)}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {promptState.cancelLabel}
              </button>
              <button
                onClick={() => handlePrompt(promptState.value)}
                className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700"
              >
                {promptState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
};
