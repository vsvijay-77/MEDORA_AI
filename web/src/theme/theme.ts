import { alpha, createTheme } from "@mui/material/styles";

const NAVY = "#0F172A";
const SLATE = "#475569";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2563EB", light: "#60A5FA", dark: "#1D4ED8", contrastText: "#fff" },
    secondary: { main: "#06B6D4", light: "#67E8F9", dark: "#0E7490", contrastText: "#fff" },
    success: { main: "#16A34A", dark: "#166534", light: "#DCFCE7" },
    warning: { main: "#F59E0B", dark: "#92400E", light: "#FEF3C7" },
    error: { main: "#DC2626", dark: "#991B1B", light: "#FEE2E2" },
    info: { main: "#0284C7" },
    background: { default: "#F7FAFC", paper: "#FFFFFF" },
    text: { primary: NAVY, secondary: SLATE, disabled: "#94A3B8" },
    divider: "#E2E8F0",
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Inter Variable", "Inter", "Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
    h1: { fontWeight: 800, fontSize: "2.25rem", letterSpacing: "-0.025em", lineHeight: 1.15 },
    h2: { fontWeight: 700, fontSize: "1.75rem", letterSpacing: "-0.02em", lineHeight: 1.2 },
    h3: { fontWeight: 700, fontSize: "1.375rem", letterSpacing: "-0.015em" },
    h4: { fontWeight: 700, fontSize: "1.125rem", letterSpacing: "-0.01em" },
    h5: { fontWeight: 600, fontSize: "1rem" },
    h6: { fontWeight: 600, fontSize: "0.9375rem" },
    subtitle1: { fontWeight: 500, color: SLATE },
    subtitle2: { fontWeight: 600 },
    body1: { fontSize: "0.9375rem", lineHeight: 1.65 },
    body2: { fontSize: "0.875rem", lineHeight: 1.6 },
    caption: { color: "#64748B", fontSize: "0.75rem", lineHeight: 1.5 },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
  },
  shadows: [
    "none",
    "0 1px 2px rgba(15,23,42,.04)",
    "0 1px 3px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04)",
    "0 4px 12px rgba(15,23,42,.06)",
    "0 8px 24px rgba(15,23,42,.07)",
    "0 12px 32px rgba(15,23,42,.08)",
    ...Array(19).fill("0 16px 40px rgba(15,23,42,.10)"),
  ] as never,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: "#F7FAFC", WebkitFontSmoothing: "antialiased" },
        "*:focus-visible": { outline: "2px solid #2563EB", outlineOffset: 2 },
        ".json-key": { color: "#7DD3FC" }, ".json-string": { color: "#86EFAC" }, ".json-number": { color: "#FCD34D" },
        ".json-bool": { color: "#F9A8D4" }, ".json-null": { color: "#A8A29E" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 12, padding: "9px 18px" },
        sizeLarge: { padding: "12px 24px", fontSize: "0.9375rem" },
        containedPrimary: { background: "linear-gradient(180deg,#3B82F6 0%,#2563EB 100%)", "&:hover": { background: "#1D4ED8" } },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { border: "1px solid #E8EEF5", boxShadow: "0 1px 3px rgba(15,23,42,.05)", borderRadius: 18 } },
    },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 18 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600, borderRadius: 999 }, sizeSmall: { height: 24, fontSize: "0.75rem" } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 12, backgroundColor: "#fff" } } },
    MuiTooltip: { defaultProps: { arrow: true }, styleOverrides: { tooltip: { backgroundColor: NAVY, fontSize: 12, borderRadius: 8 } } },
    MuiTab: { styleOverrides: { root: { minHeight: 44, fontWeight: 600 } } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: "#EEF2F7" },
        head: { color: "#64748B", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: ".04em", backgroundColor: "#F8FAFC" },
      },
    },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: 999, height: 8, backgroundColor: alpha("#2563EB", 0.1) } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 20 } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 12 } } },
  },
});
