import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import BiotechRounded from "@mui/icons-material/BiotechRounded";
import DescriptionRounded from "@mui/icons-material/DescriptionRounded";
import MedicationRounded from "@mui/icons-material/MedicationRounded";
import ShieldRounded from "@mui/icons-material/ShieldRounded";
import TimelineRounded from "@mui/icons-material/TimelineRounded";
import { Box, Stack, Typography } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { Disclaimer } from "./Disclaimer";
import { Logo } from "./Logo";

function Float({ children, x, y, delay = 0, rotate = 0 }: { children: ReactNode; x: string; y: string; delay?: number; rotate?: number }) {
  const reduce = useReducedMotion();
  return (
    <Box sx={{ position: "absolute", left: x, top: y, display: { xs: "none", lg: "block" } }}>
      <motion.div animate={reduce ? undefined : { y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, delay, ease: "easeInOut" }} style={{ rotate }}>
        {children}
      </motion.div>
    </Box>
  );
}

const glass = { backdropFilter: "blur(14px)", background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.28)", borderRadius: 4, color: "#fff", boxShadow: "0 18px 40px rgba(2,6,23,.22)" };

function Visual() {
  return (
    <Box aria-hidden sx={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <Box sx={{ position: "absolute", width: 520, height: 520, borderRadius: "50%", right: -160, top: -140, background: "radial-gradient(circle,rgba(103,232,249,.55),transparent 68%)" }} />
      <Box sx={{ position: "absolute", width: 460, height: 460, borderRadius: "50%", left: -140, bottom: -160, background: "radial-gradient(circle,rgba(147,197,253,.5),transparent 68%)" }} />
      <Float x="58%" y="12%" rotate={4}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ ...glass, p: 2, width: 250 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: "grid", placeItems: "center", bgcolor: "rgba(255,255,255,.22)" }}><BiotechRounded /></Box>
          <Box><Typography variant="subtitle2" color="inherit">Fasting glucose</Typography><Typography variant="caption" sx={{ color: "rgba(255,255,255,.8)" }}>Lab report · 3 values tracked</Typography></Box>
        </Stack>
      </Float>
      <Float x="62%" y="62%" delay={1.2} rotate={-3}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ ...glass, p: 2, width: 240 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: "grid", placeItems: "center", bgcolor: "rgba(255,255,255,.22)" }}><MedicationRounded /></Box>
          <Box><Typography variant="subtitle2" color="inherit">Prescription</Typography><Typography variant="caption" sx={{ color: "rgba(255,255,255,.8)" }}>Read, checked & organized</Typography></Box>
        </Stack>
      </Float>
      <Float x="68%" y="38%" delay={0.6}>
        <Box sx={{ ...glass, p: 1.5, display: "grid", placeItems: "center" }}><AutoAwesomeRounded /></Box>
      </Float>
      <Float x="52%" y="82%" delay={2} rotate={2}>
        <Box sx={{ ...glass, p: 1.5, display: "grid", placeItems: "center" }}><TimelineRounded /></Box>
      </Float>
      <Float x="82%" y="24%" delay={1.8}>
        <Box sx={{ ...glass, p: 1.5, display: "grid", placeItems: "center" }}><DescriptionRounded /></Box>
      </Float>
    </Box>
  );
}

export function AuthSplitLayout({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.1fr 1fr" }, bgcolor: "background.default" }}>
      <Box sx={{ position: "relative", color: "#fff", p: { xs: 3, md: 7 }, display: "flex", flexDirection: "column", justifyContent: "space-between",
        background: "linear-gradient(145deg,#1E3A8A 0%,#2563EB 52%,#06B6D4 120%)", minHeight: { xs: 220, md: "100vh" } }}>
        <Visual />
        <Box sx={{ position: "relative" }}><Logo light /></Box>
        <Box sx={{ position: "relative", maxWidth: 520, py: { xs: 3, md: 0 } }}>
          <Typography variant="h1" component="p" sx={{ color: "#fff", fontSize: { xs: "1.75rem", md: "2.6rem" } }}>Your medical records, finally understandable.</Typography>
          <Typography variant="body1" sx={{ mt: 2, color: "rgba(255,255,255,.88)", fontSize: { md: "1.0625rem" }, display: { xs: "none", sm: "block" } }}>
            Securely organize prescriptions, lab reports, discharge summaries, and your complete health history in one intelligent workspace.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ position: "relative", display: { xs: "none", md: "flex" } }}>
          <ShieldRounded sx={{ fontSize: 18, opacity: 0.9 }} />
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,.85)" }}>From fragmented medical records to one understandable health timeline.</Typography>
        </Stack>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", p: { xs: 2.5, md: 6 } }}>
        <Box sx={{ width: "100%", maxWidth: 440 }}>{children}</Box>
        <Box sx={{ mt: 4, maxWidth: 440 }}><Disclaimer /></Box>
      </Box>
    </Box>
  );
}
