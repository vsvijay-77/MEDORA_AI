import { Box, Card, CardContent, Skeleton, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface Props { icon: ReactNode; label: string; value: ReactNode; caption?: string; color?: string; loading?: boolean }

export function MetricCard({ icon, label, value, caption, color = "#2563EB", loading }: Props) {
  return (
    <Card sx={{ height: "100%", position: "relative", overflow: "hidden" }}>
      <Box aria-hidden sx={{ position: "absolute", right: -28, top: -28, width: 110, height: 110, borderRadius: "50%", bgcolor: color, opacity: 0.07 }} />
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ width: 48, height: 48, borderRadius: "50%", display: "grid", placeItems: "center", color, bgcolor: `${color}1A`, flexShrink: 0 }}>{icon}</Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
            {loading ? <Skeleton width={64} height={40} /> : <Typography variant="h2" component="p" sx={{ lineHeight: 1.1 }} data-testid="metric-value">{value}</Typography>}
          </Box>
        </Stack>
        {caption && <Typography variant="caption" sx={{ display: "block", mt: 1.5 }}>{loading ? <Skeleton width={120} /> : caption}</Typography>}
      </CardContent>
    </Card>
  );
}
