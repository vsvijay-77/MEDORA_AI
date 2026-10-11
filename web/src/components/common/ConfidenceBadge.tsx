import { Box, CircularProgress, LinearProgress, Stack, Tooltip, Typography } from "@mui/material";
import { BAND_LABEL, confidenceBand, type ConfidenceBand } from "@/utils/format";

const COLOR: Record<ConfidenceBand, "success" | "warning" | "error"> = { verified: "success", review: "warning", confirm: "error" };

interface Props { value: number | null | undefined; variant?: "circle" | "linear" | "inline"; size?: number; showLabel?: boolean }

/** Extraction confidence from the AI reader — NOT a statement of medical certainty. */
export function ConfidenceBadge({ value, variant = "inline", size = 56, showLabel = true }: Props) {
  if (value === null || value === undefined) return <Typography variant="caption" color="text.secondary">—</Typography>;
  const pct = Math.round(value * 100);
  const band = confidenceBand(value);
  const color = COLOR[band];
  const tip = "How confident the AI reader is that it read this value correctly. It is not a measure of medical certainty.";

  if (variant === "circle") {
    return (
      <Tooltip title={tip}>
        <Stack alignItems="center" spacing={0.75} data-testid="confidence-badge" data-band={band}>
          <Box sx={{ position: "relative", display: "inline-flex" }}>
            <CircularProgress variant="determinate" value={100} size={size} thickness={4} sx={{ color: "action.hover", position: "absolute" }} />
            <CircularProgress variant="determinate" value={pct} size={size} thickness={4} color={color} aria-label={`Confidence ${pct}%`} />
            <Box sx={{ inset: 0, position: "absolute", display: "grid", placeItems: "center" }}>
              <Typography variant="subtitle2" sx={{ fontSize: size * 0.27 }}>{pct}%</Typography>
            </Box>
          </Box>
          {showLabel && <Typography variant="caption" fontWeight={600} color={`${color}.dark`}>{BAND_LABEL[band]}</Typography>}
        </Stack>
      </Tooltip>
    );
  }
  if (variant === "linear") {
    return (
      <Tooltip title={tip}>
        <Box data-testid="confidence-badge" data-band={band} sx={{ minWidth: 120 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2">{pct}%</Typography>
            {showLabel && <Typography variant="caption" fontWeight={600} color={`${color}.dark`}>{BAND_LABEL[band]}</Typography>}
          </Stack>
          <LinearProgress variant="determinate" value={pct} color={color} aria-label={`Confidence ${pct}%`} sx={{ bgcolor: "action.hover" }} />
        </Box>
      </Tooltip>
    );
  }
  return (
    <Tooltip title={tip}>
      <Stack direction="row" spacing={1} alignItems="center" data-testid="confidence-badge" data-band={band}>
        <LinearProgress variant="determinate" value={pct} color={color} sx={{ width: 44, height: 6, bgcolor: "action.hover" }} aria-label={`Confidence ${pct}%`} />
        <Typography variant="body2" fontWeight={600}>{pct}%</Typography>
      </Stack>
    </Tooltip>
  );
}
