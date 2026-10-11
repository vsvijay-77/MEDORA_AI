import InfoOutlined from "@mui/icons-material/InfoOutlined";
import { Stack, Typography } from "@mui/material";
import { DISCLAIMER } from "@/utils/format";

export function Disclaimer({ align = "left" }: { align?: "left" | "center" }) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent={align === "center" ? "center" : "flex-start"} data-testid="disclaimer">
      <InfoOutlined sx={{ fontSize: 16, mt: "2px", color: "text.disabled" }} />
      <Typography variant="caption" sx={{ maxWidth: 640 }}>{DISCLAIMER}</Typography>
    </Stack>
  );
}
