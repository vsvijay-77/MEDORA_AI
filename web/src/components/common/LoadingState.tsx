import { Box, Card, CardContent, LinearProgress, Skeleton, Stack, Typography } from "@mui/material";

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card aria-busy="true"><CardContent>
      <Skeleton width="40%" height={28} />
      {Array.from({ length: lines }, (_, i) => <Skeleton key={i} height={22} width={`${92 - i * 12}%`} />)}
    </CardContent></Card>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Stack spacing={1.25} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} variant="rounded" height={56} />)}
    </Stack>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <Box role="status" sx={{ py: 8, textAlign: "center" }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{label}</Typography>
      <LinearProgress sx={{ maxWidth: 260, mx: "auto" }} />
    </Box>
  );
}
