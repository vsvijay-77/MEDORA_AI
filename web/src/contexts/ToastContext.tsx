import { Alert, Snackbar, type AlertColor } from "@mui/material";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Notify = (message: string, severity?: AlertColor) => void;
const ToastContext = createContext<Notify>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; severity: AlertColor; key: number } | null>(null);
  const notify = useCallback<Notify>((message, severity = "success") => setToast({ message, severity, key: Date.now() }), []);
  const value = useMemo(() => notify, [notify]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar key={toast?.key} open={!!toast} autoHideDuration={4500} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setToast(null)} severity={toast?.severity ?? "success"} variant="filled" sx={{ width: "100%" }}>{toast?.message}</Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
