"""Deterministic validation of extracted clinical facts.

Nothing an LLM extracts becomes "verified" until it passes these rules. The rules are pure
functions with no I/O, so they are fully unit-testable and reproducible.

Outcome per record:
  * any ERROR   -> status "rejected"      (never indexed, never shown to RAG)
  * any WARNING -> status "needs_review"  (clinician must approve)
  * otherwise   -> status "verified"      (persisted, mapped to FHIR, indexed in Qdrant)
A clinician approval clears warnings but can never clear errors.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date, datetime

KINDS = {"lab_result", "vital", "medication", "condition", "allergy", "procedure"}
NUMERIC_KINDS = {"lab_result", "vital"}


@dataclass(frozen=True)
class Analyte:
    canonical: str
    loinc: str
    unit: str
    plausible: tuple[float, float]  # hard physiological limits in canonical unit
    aliases: tuple[str, ...] = ()
    # unit alias -> multiplier into canonical unit (or callable for affine conversions)
    conversions: dict = field(default_factory=dict)
    kind: str = "lab_result"


def _f_to_c(v: float) -> float:
    return round((v - 32) * 5 / 9, 2)


CATALOG: list[Analyte] = [
    Analyte("Hemoglobin", "718-7", "g/dL", (2, 25), ("hb", "hgb", "haemoglobin"), {"g/l": 0.1, "mmol/l": 1.611}),
    Analyte("HbA1c", "4548-4", "%", (3, 20), ("a1c", "glycated hemoglobin", "glycated haemoglobin", "glycosylated hemoglobin", "glycosylated haemoglobin", "hemoglobin a1c")),
    Analyte("Fasting glucose", "1558-6", "mg/dL", (20, 1000), ("fasting blood sugar", "fbs", "fasting plasma glucose", "fbg", "glucose fasting"), {"mmol/l": 18.016}),
    Analyte("Random glucose", "2345-7", "mg/dL", (20, 1500), ("random blood sugar", "rbs", "blood glucose", "glucose"), {"mmol/l": 18.016}),
    Analyte("Postprandial glucose", "1521-4", "mg/dL", (20, 1500), ("ppbs", "post prandial blood sugar", "postprandial blood sugar", "pp glucose"), {"mmol/l": 18.016}),
    Analyte("Creatinine", "2160-0", "mg/dL", (0.1, 20), ("serum creatinine", "s. creatinine"), {"umol/l": 1 / 88.42}),
    Analyte("Total cholesterol", "2093-3", "mg/dL", (50, 600), ("cholesterol", "total cholesterol", "serum cholesterol"), {"mmol/l": 38.67}),
    Analyte("LDL cholesterol", "13457-7", "mg/dL", (10, 400), ("ldl", "ldl-c", "ldl cholesterol"), {"mmol/l": 38.67}),
    Analyte("HDL cholesterol", "2085-9", "mg/dL", (5, 150), ("hdl", "hdl-c", "hdl cholesterol"), {"mmol/l": 38.67}),
    Analyte("Triglycerides", "2571-8", "mg/dL", (20, 5000), ("tg", "triglyceride", "serum triglycerides"), {"mmol/l": 88.57}),
    Analyte("TSH", "3016-3", "mIU/L", (0.001, 150), ("thyroid stimulating hormone",), {"uiu/ml": 1.0, "miu/ml": 1000.0}),
    Analyte("Sodium", "2951-2", "mmol/L", (100, 180), ("na", "serum sodium"), {"meq/l": 1.0}),
    Analyte("Potassium", "2823-3", "mmol/L", (1.5, 9), ("k", "serum potassium"), {"meq/l": 1.0}),
    Analyte("Platelet count", "777-3", "10^3/uL", (1, 2000), ("platelets", "plt", "platelet"), {"x10^3/ul": 1.0, "10^9/l": 1.0, "x10^9/l": 1.0, "k/ul": 1.0, "thou/ul": 1.0, "lakh/cumm": 100.0, "/cumm": 0.001, "/ul": 0.001}),
    Analyte("White blood cell count", "6690-2", "10^3/uL", (0.1, 200), ("wbc", "tlc", "total leucocyte count", "total leukocyte count", "white blood cells"), {"x10^3/ul": 1.0, "10^9/l": 1.0, "x10^9/l": 1.0, "k/ul": 1.0, "thou/ul": 1.0, "/cumm": 0.001, "/ul": 0.001}),
    Analyte("Vitamin D (25-OH)", "1989-3", "ng/mL", (2, 200), ("vitamin d", "25-oh vitamin d", "25 hydroxy vitamin d", "vit d"), {"nmol/l": 0.4006}),
    Analyte("Vitamin B12", "2132-9", "pg/mL", (50, 5000), ("b12", "vit b12", "cobalamin"), {"pmol/l": 1.355}),
    # vitals
    Analyte("Systolic blood pressure", "8480-6", "mmHg", (40, 300), ("systolic bp", "sbp", "systolic"), kind="vital"),
    Analyte("Diastolic blood pressure", "8462-4", "mmHg", (20, 200), ("diastolic bp", "dbp", "diastolic"), kind="vital"),
    Analyte("Heart rate", "8867-4", "/min", (20, 250), ("pulse", "pulse rate", "hr"), {"bpm": 1.0, "beats/min": 1.0}, kind="vital"),
    Analyte("Body temperature", "8310-5", "Cel", (30, 45), ("temperature", "temp"), {"c": 1.0, "°c": 1.0, "degc": 1.0, "f": _f_to_c, "°f": _f_to_c, "degf": _f_to_c}, kind="vital"),
    Analyte("Body weight", "29463-7", "kg", (0.5, 400), ("weight", "wt"), {"kgs": 1.0, "lb": 0.4536, "lbs": 0.4536}, kind="vital"),
    Analyte("Body height", "8302-2", "cm", (30, 250), ("height", "ht"), {"m": 100.0, "in": 2.54}, kind="vital"),
    Analyte("Oxygen saturation", "59408-5", "%", (50, 100), ("spo2", "sp02", "oxygen saturation"), kind="vital"),
    Analyte("BMI", "39156-5", "kg/m2", (8, 100), ("body mass index",), {"kg/m^2": 1.0, "kg/m²": 1.0}, kind="vital"),
]

_ALIAS_INDEX: dict[str, Analyte] = {}
for _a in CATALOG:
    for _n in (_a.canonical, *_a.aliases):
        _ALIAS_INDEX[_n.lower()] = _a


def _norm_name(name: str) -> str:
    n = re.sub(r"\(.*?\)", " ", unicodedata.normalize("NFKC", name).lower())
    n = re.sub(r"[^a-z0-9%\-\. ]+", " ", n)
    return re.sub(r"\s+", " ", n).strip(" .-")


def lookup_analyte(name: str) -> Analyte | None:
    n = _norm_name(name)
    if n in _ALIAS_INDEX:
        return _ALIAS_INDEX[n]
    raw = name.lower().strip()
    return _ALIAS_INDEX.get(raw)


def norm_unit(unit: str | None) -> str:
    if not unit:
        return ""
    u = unit.strip().lower().replace("µ", "u").replace("μ", "u").replace(" ", "")
    u = u.replace("gm/", "g/").replace("gms/", "g/").replace("cu.mm", "cumm").replace("mm3", "cumm")
    u = u.replace("×", "x").replace("*", "x")
    return u


# --- dates -------------------------------------------------------------------
_DATE_FORMATS = ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%d %b %Y", "%d %B %Y", "%b %d, %Y", "%B %d, %Y", "%d-%b-%Y", "%d/%m/%y", "%Y/%m/%d"]


def parse_date(value) -> date | None:
    """Parse a document date. Ambiguous numeric dates use day-first (Indian convention)."""
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    s = str(value).strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"unparseable date: {s!r}")


# --- numbers -------------------------------------------------------------------
_NUM_RE = re.compile(r"^\s*([<>]=?)?\s*(-?\d+(?:[.,]\d+)?)\s*$")


def parse_number(value) -> tuple[float | None, str | None]:
    """Returns (number, comparator). Comparator is '<', '>', '<=', '>=' or None."""
    if value is None or value == "":
        return None, None
    if isinstance(value, bool):
        return None, None
    if isinstance(value, (int, float)):
        return float(value), None
    m = _NUM_RE.match(str(value))
    if not m:
        return None, None
    return float(m.group(2).replace(",", ".")), m.group(1)


_RANGE_RE = re.compile(r"^\s*(-?\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(-?\d+(?:\.\d+)?)\s*$")
_UPPER_RE = re.compile(r"^\s*(?:<|<=|upto|up to|less than)\s*(-?\d+(?:\.\d+)?)\s*$", re.I)
_LOWER_RE = re.compile(r"^\s*(?:>|>=|more than|greater than)\s*(-?\d+(?:\.\d+)?)\s*$", re.I)


def parse_ref_range(text: str | None) -> tuple[float | None, float | None]:
    if not text:
        return None, None
    t = str(text).strip()
    if m := _RANGE_RE.match(t):
        return float(m.group(1)), float(m.group(2))
    if m := _UPPER_RE.match(t):
        return None, float(m.group(1))
    if m := _LOWER_RE.match(t):
        return float(m.group(1)), None
    raise ValueError(f"unparseable reference range: {t!r}")


def compute_flag(v: float, low: float | None, high: float | None) -> str | None:
    if low is None and high is None:
        return None
    if low is not None and v < low:
        return "low"
    if high is not None and v > high:
        return "high"
    return "normal"


# --- medications -----------------------------------------------------------------
DOSE_RE = re.compile(r"^\s*\d+(?:\.\d+)?\s*(mg|mcg|ug|g|ml|iu|units?|%|puffs?|drops?|tabs?|tablets?|caps?)\b", re.I)
FREQUENCY_MAP = {
    "od": "once daily", "qd": "once daily", "once a day": "once daily", "once daily": "once daily", "daily": "once daily", "1-0-0": "once daily (morning)", "0-0-1": "once daily (night)",
    "bd": "twice daily", "bid": "twice daily", "twice a day": "twice daily", "twice daily": "twice daily", "1-0-1": "twice daily",
    "tds": "three times daily", "tid": "three times daily", "thrice daily": "three times daily", "three times a day": "three times daily", "1-1-1": "three times daily",
    "qid": "four times daily", "four times a day": "four times daily",
    "hs": "at bedtime", "at bedtime": "at bedtime", "at night": "at bedtime",
    "sos": "as needed", "prn": "as needed", "as needed": "as needed",
    "weekly": "once weekly", "once a week": "once weekly", "stat": "single dose",
}


def normalize_frequency(freq: str | None) -> str | None:
    if not freq:
        return None
    key = re.sub(r"\s+", " ", freq.strip().lower())
    return FREQUENCY_MAP.get(key)


# --- grounding ---------------------------------------------------------------------
def _squash(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip().lower()


def _num_variants(v: float) -> set[str]:
    out = {f"{v:g}", f"{v:.1f}", f"{v:.2f}"}
    if v == int(v):
        out.add(str(int(v)))
    return out


# --- result types -----------------------------------------------------------------
@dataclass
class Issue:
    level: str  # "error" | "warning"
    code: str
    message: str

    def as_dict(self) -> dict:
        return {"level": self.level, "code": self.code, "message": self.message}


@dataclass
class ValidationResult:
    status: str
    fields: dict
    issues: list[Issue]

    @property
    def errors(self) -> list[Issue]:
        return [i for i in self.issues if i.level == "error"]

    @property
    def warnings(self) -> list[Issue]:
        return [i for i in self.issues if i.level == "warning"]


def validate_item(
    item: dict,
    *,
    document_text: str | None = None,
    birth_date: date | None = None,
    today: date | None = None,
    min_confidence: float = 0.8,
    human_verified: bool = False,
) -> ValidationResult:
    today = today or date.today()
    issues: list[Issue] = []

    def err(code, msg):
        issues.append(Issue("error", code, msg))

    def warn(code, msg):
        issues.append(Issue("warning", code, msg))

    kind = (item.get("kind") or "").strip().lower()
    name = (item.get("name") or "").strip()
    out: dict = {
        "kind": kind, "name": name[:200], "code": None, "value_num": None, "value_text": None,
        "unit": None, "ref_low": None, "ref_high": None, "flag": None, "effective_date": None,
        "dose": None, "frequency": None, "confidence": item.get("confidence"),
        "source_text": (item.get("source_text") or None),
    }

    if kind not in KINDS:
        err("invalid_kind", f"Unknown record kind '{kind}'.")
    if not name:
        err("missing_name", "Record has no name.")
    elif len(name) > 200:
        err("name_too_long", "Record name exceeds 200 characters.")

    # --- date
    try:
        d = parse_date(item.get("date"))
    except ValueError as e:
        d = None
        err("invalid_date", str(e))
    else:
        if d is None:
            if kind in NUMERIC_KINDS:
                warn("missing_date", "No date found for this measurement.")
        elif d > today:
            err("future_date", f"Date {d.isoformat()} is in the future.")
        elif d.year < 1900:
            err("date_too_old", f"Date {d.isoformat()} is before 1900.")
        elif birth_date and d < birth_date:
            err("date_before_birth", f"Date {d.isoformat()} is before the patient's birth date.")
    out["effective_date"] = d

    # --- numeric observations
    if kind in NUMERIC_KINDS and name:
        analyte = lookup_analyte(name)
        value, comparator = parse_number(item.get("value"))
        if analyte and analyte.kind != kind:
            warn("kind_mismatch", f"'{name}' is usually a {analyte.kind}, not a {kind}.")
        if value is None:
            raw = item.get("value")
            if raw in (None, ""):
                err("missing_value", "Measurement has no value.")
            elif analyte:
                err("non_numeric_value", f"Expected a number for {analyte.canonical}, got {raw!r}.")
            else:
                out["value_text"] = str(raw)[:500]
                warn("qualitative_value", "Qualitative result needs clinician confirmation.")
        if comparator:
            out["value_text"] = f"{comparator}{item.get('value')}".replace(f"{comparator}{comparator}", comparator)
            warn("censored_value", f"Value is reported as '{comparator}' a limit.")

        unit_raw = item.get("unit")
        try:
            low, high = parse_ref_range(item.get("ref_range")) if item.get("ref_range") else (
                parse_number(item.get("ref_low"))[0], parse_number(item.get("ref_high"))[0])
        except ValueError as e:
            low = high = None
            warn("invalid_ref_range", str(e))
        if low is not None and high is not None and low > high:
            warn("invalid_ref_range", "Reference range low bound exceeds high bound.")
            low = high = None

        if analyte:
            out["name"] = analyte.canonical
            out["code"] = analyte.loinc
            u = norm_unit(unit_raw)
            factor = None
            if u == norm_unit(analyte.unit) or (u == "" and analyte.unit in ("%",)):
                factor = 1.0
            elif u in analyte.conversions:
                factor = analyte.conversions[u]
            elif u == "":
                warn("missing_unit", f"No unit given for {analyte.canonical}; expected {analyte.unit}.")
            else:
                warn("unit_unrecognized", f"Unit '{unit_raw}' is not recognised for {analyte.canonical}; expected {analyte.unit}.")

            def conv(x):
                if x is None or factor is None:
                    return x
                return round(factor(x), 4) if callable(factor) else round(x * factor, 4)

            if factor is not None:
                out["unit"] = analyte.unit
                value, low, high = conv(value), conv(low), conv(high)
            else:
                out["unit"] = unit_raw
            if value is not None and factor is not None:
                lo, hi = analyte.plausible
                if not (lo <= value <= hi):
                    err("implausible_value", f"{analyte.canonical} {value:g} {analyte.unit} is outside the physiologically possible range {lo:g}–{hi:g}.")
        else:
            out["unit"] = unit_raw or None
            if value is not None:
                warn("unknown_analyte", f"'{name}' is not in the validated analyte catalogue.")

        out["value_num"] = value
        out["ref_low"], out["ref_high"] = low, high
        if value is not None and not comparator:
            computed = compute_flag(value, low, high)
            out["flag"] = computed
            claimed = (item.get("flag") or "").strip().lower() or None
            claimed = {"h": "high", "l": "low", "n": "normal"}.get(claimed, claimed)
            if claimed and computed and claimed != computed:
                warn("flag_mismatch", f"Document flag '{claimed}' disagrees with computed flag '{computed}'; computed flag kept.")

    # --- medications
    if kind == "medication":
        dose = (item.get("dose") or "").strip()
        if not dose:
            warn("missing_dose", "Medication has no dose.")
        elif not DOSE_RE.match(dose):
            warn("invalid_dose", f"Dose '{dose}' is not in a recognised format.")
        out["dose"] = dose or None
        freq = item.get("frequency")
        nf = normalize_frequency(freq)
        if freq and not nf:
            warn("unknown_frequency", f"Frequency '{freq}' is not recognised.")
        out["frequency"] = nf or (freq or None)

    if kind in {"condition", "allergy", "procedure"} and item.get("value") not in (None, ""):
        out["value_text"] = str(item.get("value"))[:500]

    # --- extraction confidence
    conf = item.get("confidence")
    if conf is None:
        warn("missing_confidence", "Extractor did not report a confidence.")
    else:
        try:
            conf = float(conf)
        except (TypeError, ValueError):
            conf = 0.0
        out["confidence"] = conf
        if conf < min_confidence:
            warn("low_confidence", f"Extraction confidence {conf:.2f} is below {min_confidence:.2f}.")

    # --- grounding: the evidence must exist in the source document, and contain the value
    src = out["source_text"]
    if document_text is not None:
        if not src:
            warn("no_source_text", "Extractor did not cite the source text.")
        elif _squash(src) not in _squash(document_text):
            warn("ungrounded_source", "Cited source text was not found in the document.")
        if src and kind in NUMERIC_KINDS:
            raw_v, _ = parse_number(item.get("value"))
            if raw_v is not None and not any(v in src for v in _num_variants(raw_v)):
                warn("value_not_in_source", "Extracted value does not appear in the cited source text.")

    if human_verified:
        issues = [i for i in issues if i.level == "error"]

    status = "rejected" if any(i.level == "error" for i in issues) else (
        "needs_review" if issues else "verified")
    return ValidationResult(status, out, issues)
