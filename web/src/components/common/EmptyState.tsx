import FolderOpenRounded from "@mui/icons-material/FolderOpenRounded";
import { Box, Button, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface Props { title: string; text: string; icon?: ReactNode; actionLabel?: string; onAction?: () => void; compact?: boolean }

export function EmptyState({ title, text, icon, actionLabel, onAction, compact }: Props) {
  return (
    <Stack alignItems="center" textAlign="center" spacing={1.5} sx={{ py: compact ? 4 : 8, px: 2 }} role="status">
      <Box sx={{ width: 76, height: 76, borderRadius: "50%", display: "grid", placeItems: "center", color: "primary.main",
        background: "linear-gradient(135deg,rgba(37,99,235,.12),rgba(6,182,212,.14))" }}>
        {icon ?? <FolderOpenRounded sx={{ fontSize: 36 }} />}
      </Box>
      <Typography variant="h3">{title}</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 440 }}>{text}</Typography>
      {actionLabel && onAction && <Button variant="contained" size="large" onClick={onAction} sx={{ mt: 1 }}>{actionLabel}</Button>}
    </Stack>
  );
}
