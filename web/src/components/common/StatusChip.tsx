import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import HourglassTopRounded from "@mui/icons-material/HourglassTopRounded";
import RateReviewRounded from "@mui/icons-material/RateReviewRounded";
import ArrowDownwardRounded from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRounded from "@mui/icons-material/ArrowUpwardRounded";
import RemoveRounded from "@mui/icons-material/RemoveRounded";
import { Chip, type ChipProps } from "@mui/material";
import type { ReactElement } from "react";

export type ChipStatus = "Verified" | "Review" | "Needs Confirmation" | "Processing" | "Failed" | "Rejected" | "NORMAL" | "LOW" | "HIGH" | "UNKNOWN";

const TONES: Record<ChipStatus, { bg: string; fg: string; icon: ReactElement }> = {
  Verified: { bg: "#DCFCE7", fg: "#166534", icon: <CheckCircleRounded /> },
  Review: { bg: "#FEF3C7", fg: "#92400E", icon: <RateReviewRounded /> },
  "Needs Confirmation": { bg: "#FFEDD5", fg: "#9A3412", icon: <ErrorOutlineRounded /> },
  Processing: { bg: "#DBEAFE", fg: "#1E40AF", icon: <HourglassTopRounded /> },
  Failed: { bg: "#FEE2E2", fg: "#991B1B", icon: <ErrorOutlineRounded /> },
  Rejected: { bg: "#F1F5F9", fg: "#475569", icon: <ErrorOutlineRounded /> },
  NORMAL: { bg: "#DCFCE7", fg: "#166534", icon: <RemoveRounded /> },
  LOW: { bg: "#FEF3C7", fg: "#92400E", icon: <ArrowDownwardRounded /> },
  HIGH: { bg: "#FEE2E2", fg: "#991B1B", icon: <ArrowUpwardRounded /> },
  UNKNOWN: { bg: "#F1F5F9", fg: "#475569", icon: <RemoveRounded /> },
};

export function StatusChip({ status, size = "small", ...rest }: { status: ChipStatus } & Omit<ChipProps, "label" | "color" | "icon">) {
  const t = TONES[status];
  return (
    <Chip size={size} label={status} icon={t.icon} data-testid="status-chip" {...rest}
      sx={{ bgcolor: t.bg, color: t.fg, "& .MuiChip-icon": { color: t.fg, fontSize: 16 }, ...rest.sx }} />
  );
}

export const flagToChip = (flag: string | null | undefined): ChipStatus => (flag === "low" ? "LOW" : flag === "high" ? "HIGH" : flag === "normal" ? "NORMAL" : "UNKNOWN");
