import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions, icon }: { title: string; subtitle?: string; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2} sx={{ mb: 3 }}>
      <Stack direction="row" spacing={1.75} alignItems="center">
        {icon && <Box sx={{ width: 44, height: 44, borderRadius: 3, display: "grid", placeItems: "center", bgcolor: "primary.main", color: "#fff", opacity: 0.95 }}>{icon}</Box>}
        <Box>
          <Typography variant="h2" component="h1" sx={{ fontSize: { xs: "1.5rem", md: "1.75rem" } }}>{title}</Typography>
          {subtitle && <Typography variant="body1" color="text.secondary" sx={{ mt: 0.25 }}>{subtitle}</Typography>}
        </Box>
      </Stack>
      {actions && <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>{actions}</Stack>}
    </Stack>
  );
}
