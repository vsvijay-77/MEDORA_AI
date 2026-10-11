import { Box, Stack, Typography } from "@mui/material";

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <Box aria-hidden sx={{ width: size, height: size, borderRadius: `${size * 0.28}px`, display: "grid", placeItems: "center",
      background: "linear-gradient(135deg,#2563EB 0%,#06B6D4 100%)", boxShadow: "0 6px 16px rgba(37,99,235,.35)", flexShrink: 0 }}>
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="#fff"><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" /></svg>
    </Box>
  );
}

export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.25}>
      <LogoMark />
      {!compact && <Typography variant="h4" component="span" sx={{ color: light ? "#fff" : "text.primary", fontWeight: 800 }}>MedChronicle</Typography>}
    </Stack>
  );
}
