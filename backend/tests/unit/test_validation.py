from datetime import date

import pytest

from app.validation import compute_flag, lookup_analyte, normalize_frequency, parse_date, parse_number, parse_ref_range, validate_item

TODAY = date(2026, 10, 11)
DOC = "Report Date: 14/03/2026\nHemoglobin: 10.2 g/dL (12.0-15.5) L\nRx: Metformin 500 mg BD"


def lab(**kw):
    base = {"kind": "lab_result", "name": "Hemoglobin", "value": "10.2", "unit": "g/dL", "ref_range": "12.0-15.5",
            "date": "14/03/2026", "confidence": 0.95, "source_text": "Hemoglobin: 10.2 g/dL (12.0-15.5) L"}
    return base | kw


def v(item, **kw):
    return validate_item(item, today=TODAY, document_text=kw.pop("doc", DOC), **kw)


def codes(res):
    return {i.code for i in res.issues}


class TestParsers:
    @pytest.mark.parametrize("raw,expected", [
        ("2026-03-14", date(2026, 3, 14)), ("14/03/2026", date(2026, 3, 14)), ("04/03/2026", date(2026, 3, 4)),
        ("14-03-2026", date(2026, 3, 14)), ("14 Mar 2026", date(2026, 3, 14)), ("March 14, 2026", date(2026, 3, 14)),
        (None, None), ("", None),
    ])
    def test_parse_date(self, raw, expected):
        assert parse_date(raw) == expected

    def test_day_first_for_ambiguous_dates(self):
        assert parse_date("03/04/2026") == date(2026, 4, 3)  # 3 April (Indian convention)

    def test_parse_date_rejects_garbage(self):
        with pytest.raises(ValueError):
            parse_date("last tuesday")

    @pytest.mark.parametrize("raw,expected", [("10.2", (10.2, None)), (7, (7.0, None)), ("<5", (5.0, "<")), (">= 90", (90.0, ">=")),
                                              ("10,5", (10.5, None)), ("abc", (None, None)), (None, (None, None)), (True, (None, None))])
    def test_parse_number(self, raw, expected):
        assert parse_number(raw) == expected

    @pytest.mark.parametrize("raw,expected", [("12.0-15.5", (12.0, 15.5)), ("12 – 15.5", (12.0, 15.5)), ("70 to 100", (70.0, 100.0)),
                                              ("<200", (None, 200.0)), ("up to 40", (None, 40.0)), (">40", (40.0, None)), (None, (None, None))])
    def test_parse_ref_range(self, raw, expected):
        assert parse_ref_range(raw) == expected

    def test_flag(self):
        assert compute_flag(10, 12, 15) == "low"
        assert compute_flag(16, 12, 15) == "high"
        assert compute_flag(13, 12, 15) == "normal"
        assert compute_flag(13, None, None) is None
        assert compute_flag(250, None, 200) == "high"

    @pytest.mark.parametrize("name,canonical", [("Hb", "Hemoglobin"), ("HAEMOGLOBIN", "Hemoglobin"), ("Fasting Blood Sugar", "Fasting glucose"),
                                                 ("Serum Creatinine", "Creatinine"), ("HbA1c (Glycated)", "HbA1c"), ("SpO2", "Oxygen saturation")])
    def test_analyte_lookup(self, name, canonical):
        assert lookup_analyte(name).canonical == canonical

    def test_frequency(self):
        assert normalize_frequency("BD") == "twice daily"
        assert normalize_frequency(" 1-0-1 ") == "twice daily"
        assert normalize_frequency("whenever") is None

    def test_ocr_subscript_oxygen_saturation_is_validated(self):
        result = validate_item({"kind": "vital", "name": "SPO₂", "value": "98", "unit": "%",
                                "date": "17/7/24", "confidence": 0.95, "source_text": "SPO₂≈98%."},
                               document_text="SPO₂≈98%.", today=TODAY)
        assert result.status == "verified"
        assert result.fields["name"] == "Oxygen saturation"
        assert result.fields["value_num"] == 98


class TestLabValidation:
    def test_clean_lab_is_verified_and_normalised(self):
        r = v(lab())
        assert r.status == "verified", r.issues
        f = r.fields
        assert (f["name"], f["code"], f["value_num"], f["unit"], f["flag"]) == ("Hemoglobin", "718-7", 10.2, "g/dL", "low")
        assert f["effective_date"] == date(2026, 3, 14)

    def test_unit_conversion_g_per_l(self):
        doc = "Hemoglobin: 102 g/L (120-155)"
        r = v(lab(value="102", unit="g/L", ref_range="120-155", source_text=doc), doc=doc)
        assert r.status == "verified"
        assert r.fields["value_num"] == pytest.approx(10.2)
        assert r.fields["ref_low"] == pytest.approx(12.0)
        assert r.fields["unit"] == "g/dL"

    def test_glucose_mmol_converted(self):
        doc = "FBS: 7.9 mmol/L"
        r = v({"kind": "lab_result", "name": "FBS", "value": "7.9", "unit": "mmol/L", "date": "2026-01-01", "confidence": 0.9, "source_text": doc}, doc=doc)
        assert r.fields["value_num"] == pytest.approx(142.33, abs=0.01)

    def test_fahrenheit_converted(self):
        doc = "Temp: 98.6 F"
        r = v({"kind": "vital", "name": "Temp", "value": "98.6", "unit": "F", "date": "2026-01-01", "confidence": 0.9, "source_text": doc}, doc=doc)
        assert r.status == "verified"
        assert r.fields["value_num"] == pytest.approx(37.0)

    def test_lakh_platelets_converted(self):
        doc = "Platelet count: 2.5 lakh/cumm (1.5-4.5)"
        r = v({"kind": "lab_result", "name": "Platelet count", "value": "2.5", "unit": "lakh/cumm", "ref_range": "1.5-4.5",
               "date": "2026-08-20", "confidence": 0.9, "source_text": doc}, doc=doc)
        assert r.status == "verified"
        assert r.fields["value_num"] == 250 and r.fields["ref_high"] == 450 and r.fields["flag"] == "normal"

    def test_implausible_value_rejected(self):
        doc = "Hemoglobin: 102 g/dL"
        r = v(lab(value="102", ref_range=None, source_text=doc), doc=doc)
        assert r.status == "rejected"
        assert "implausible_value" in codes(r)

    def test_future_date_rejected(self):
        assert v(lab(date="01/01/2027")).status == "rejected"

    def test_date_before_birth_rejected(self):
        r = v(lab(date="01/01/1960"), birth_date=date(1974, 5, 2))
        assert "date_before_birth" in codes(r) and r.status == "rejected"

    def test_missing_date_needs_review(self):
        r = v(lab(date=None))
        assert r.status == "needs_review" and "missing_date" in codes(r)

    def test_unknown_unit_needs_review(self):
        r = v(lab(unit="furlongs"))
        assert r.status == "needs_review" and "unit_unrecognized" in codes(r)

    def test_unknown_analyte_needs_review(self):
        doc = "Mystery Marker X: 42 units"
        r = v({"kind": "lab_result", "name": "Mystery Marker X", "value": "42", "unit": "units", "date": "2026-01-01", "confidence": 0.9, "source_text": doc}, doc=doc)
        assert r.status == "needs_review" and "unknown_analyte" in codes(r)

    def test_non_numeric_known_analyte_rejected(self):
        assert "non_numeric_value" in codes(v(lab(value="high-ish")))

    def test_missing_value_rejected(self):
        assert v(lab(value=None)).status == "rejected"

    def test_censored_value_needs_review(self):
        doc = "TSH: <0.01 mIU/L"
        r = v({"kind": "lab_result", "name": "TSH", "value": "<0.01", "unit": "mIU/L", "date": "2026-01-01", "confidence": 0.9, "source_text": doc}, doc=doc)
        assert r.status == "needs_review" and r.fields["flag"] is None and r.fields["value_text"] == "<0.01"

    def test_flag_mismatch_warns_and_keeps_computed(self):
        r = v(lab(flag="H"))
        assert "flag_mismatch" in codes(r) and r.fields["flag"] == "low"

    def test_low_confidence_needs_review(self):
        r = v(lab(confidence=0.4))
        assert r.status == "needs_review" and "low_confidence" in codes(r)

    def test_invalid_kind_rejected(self):
        assert v(lab(kind="horoscope")).status == "rejected"

    def test_inverted_reference_range_dropped(self):
        r = v(lab(ref_range="15-12"))
        assert "invalid_ref_range" in codes(r) and r.fields["ref_low"] is None


class TestGrounding:
    def test_source_not_in_document_needs_review(self):
        r = v(lab(source_text="Hemoglobin: 9.1 g/dL"))
        assert {"ungrounded_source", "value_not_in_source"} <= codes(r)
        assert r.status == "needs_review"

    def test_value_not_in_source_text(self):
        r = v(lab(value="11.2"))  # hallucinated value, real source line
        assert "value_not_in_source" in codes(r)

    def test_no_document_text_skips_grounding(self):
        r = validate_item(lab(source_text=None), today=TODAY)
        assert r.status == "verified"


class TestMedications:
    def test_medication_verified_and_frequency_normalised(self):
        r = v({"kind": "medication", "name": "Metformin", "dose": "500 mg", "frequency": "BD", "confidence": 0.9, "source_text": "Rx: Metformin 500 mg BD"})
        assert r.status == "verified"
        assert r.fields["frequency"] == "twice daily"

    @pytest.mark.parametrize("dose,code", [("", "missing_dose"), ("a lot", "invalid_dose")])
    def test_bad_dose(self, dose, code):
        r = v({"kind": "medication", "name": "Metformin", "dose": dose, "frequency": "BD", "confidence": 0.9, "source_text": "Rx: Metformin 500 mg BD"})
        assert code in codes(r) and r.status == "needs_review"

    def test_unknown_frequency(self):
        r = v({"kind": "medication", "name": "Metformin", "dose": "500 mg", "frequency": "when sad", "confidence": 0.9, "source_text": "Rx: Metformin 500 mg BD"})
        assert "unknown_frequency" in codes(r)


class TestHumanReview:
    def test_clinician_clears_warnings(self):
        r = validate_item(lab(confidence=0.3, unit="furlongs"), today=TODAY, document_text=DOC, human_verified=True)
        assert r.status == "verified"

    def test_clinician_cannot_clear_errors(self):
        r = validate_item(lab(value="102", source_text=None), today=TODAY, human_verified=True)
        assert r.status == "rejected"
