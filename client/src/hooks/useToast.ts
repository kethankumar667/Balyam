import { toastStore, type ToastType } from "../lib/toastStore";

function show(message: string, type: ToastType = "default"): string {
  return toastStore.show(message, type);
}

/** Callable as `toast("msg")` or `toast.success("msg")` — same shape the app used with sonner, now backed by our own store. */
export const toast = Object.assign((message: string) => show(message, "default"), {
  success: (message: string) => show(message, "success"),
  error: (message: string) => show(message, "error"),
  info: (message: string) => show(message, "info"),
  warning: (message: string) => show(message, "warning"),
  dismiss: (id: string) => toastStore.dismiss(id),
});

export function useToast(): {
  toast: typeof toast;
  showToast: (message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
} {
  return {
    toast,
    showToast: (message: string) => show(message, "default"),
    success: (message: string) => show(message, "success"),
    error: (message: string) => show(message, "error"),
    info: (message: string) => show(message, "info"),
    warning: (message: string) => show(message, "warning"),
  };
}
