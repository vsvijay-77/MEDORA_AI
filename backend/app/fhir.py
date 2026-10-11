"""Map verified records to FHIR R4 resources. Only status == 'verified' records are ever mapped."""
from __future__ import annotations

from datetime import datetime, timezone

from .models import ClinicalRecord, Document, Patient

UCUM = {"10^3/uL": "10*3/uL", "mmHg": "mm[Hg]", "/min": "/min", "Cel": "Cel", "kg/m2": "kg/m2"}
INTERP = {"low": ("L", "Low"), "high": ("H", "High"), "normal": ("N", "Normal")}


def patient_resource(p: Patient) -> dict:
    r = {"resourceType": "Patient", "id": p.id, "name": [{"text": p.name}]}
    if p.birth_date:
        r["birthDate"] = p.birth_date.isoformat()
    if p.sex:
        r["gender"] = p.sex if p.sex in {"male", "female", "other", "unknown"} else "unknown"
    return r


def _source_ext(rec: ClinicalRecord) -> list[dict]:
    return [{"url": "https://medchronicle.app/fhir/StructureDefinition/source-document", "valueString": rec.document_id}] if rec.document_id else []


def record_resource(rec: ClinicalRecord) -> dict:
    if rec.status != "verified":
        raise ValueError("only verified records can be exported to FHIR")
    subject = {"reference": f"Patient/{rec.patient_id}"}
    date = rec.effective_date.isoformat() if rec.effective_date else None

    if rec.kind in ("lab_result", "vital"):
        cat = "laboratory" if rec.kind == "lab_result" else "vital-signs"
        coding = [{"system": "http://loinc.org", "code": rec.code, "display": rec.name}] if rec.code else []
        r: dict = {
            "resourceType": "Observation", "id": rec.id, "status": "final",
            "category": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": cat}]}],
            "code": {"coding": coding, "text": rec.name}, "subject": subject,
        }
        if date:
            r["effectiveDateTime"] = date
        if rec.value_num is not None and not rec.value_text:
            q = {"value": rec.value_num}
            if rec.unit:
                q |= {"unit": rec.unit, "system": "http://unitsofmeasure.org", "code": UCUM.get(rec.unit, rec.unit)}
            r["valueQuantity"] = q
        elif rec.value_text:
            r["valueString"] = rec.value_text
        if rec.ref_low is not None or rec.ref_high is not None:
            rr: dict = {}
            if rec.ref_low is not None:
                rr["low"] = {"value": rec.ref_low, "unit": rec.unit}
            if rec.ref_high is not None:
                rr["high"] = {"value": rec.ref_high, "unit": rec.unit}
            r["referenceRange"] = [rr]
        if rec.flag in INTERP:
            c, d = INTERP[rec.flag]
            r["interpretation"] = [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", "code": c, "display": d}]}]
    elif rec.kind == "medication":
        r = {"resourceType": "MedicationStatement", "id": rec.id, "status": "active",
             "medicationCodeableConcept": {"text": rec.name}, "subject": subject}
        dosage_text = " ".join(x for x in (rec.dose, rec.frequency) if x)
        if dosage_text:
            r["dosage"] = [{"text": dosage_text}]
        if date:
            r["effectiveDateTime"] = date
    elif rec.kind == "condition":
        r = {"resourceType": "Condition", "id": rec.id, "code": {"text": rec.name}, "subject": subject,
             "verificationStatus": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-ver-status", "code": "confirmed"}]}}
        if date:
            r["recordedDate"] = date
    elif rec.kind == "allergy":
        r = {"resourceType": "AllergyIntolerance", "id": rec.id, "code": {"text": rec.name}, "patient": subject}
        if rec.value_text:
            r["reaction"] = [{"description": rec.value_text}]
        if date:
            r["recordedDate"] = date
    elif rec.kind == "procedure":
        r = {"resourceType": "Procedure", "id": rec.id, "status": "completed", "code": {"text": rec.name}, "subject": subject}
        if date:
            r["performedDateTime"] = date
    else:  # pragma: no cover - guarded by validation
        raise ValueError(f"unsupported kind {rec.kind}")

    if ext := _source_ext(rec):
        r["extension"] = ext
    return r


def document_reference(doc: Document) -> dict:
    return {
        "resourceType": "DocumentReference", "id": doc.id, "status": "current",
        "subject": {"reference": f"Patient/{doc.patient_id}"},
        "date": doc.created_at.astimezone(timezone.utc).isoformat() if doc.created_at else None,
        "content": [{"attachment": {"contentType": doc.mime_type, "title": doc.filename, "hash": doc.sha256}}],
    }


def patient_bundle(p: Patient, records: list[ClinicalRecord], docs: list[Document]) -> dict:
    entries = [patient_resource(p)]
    entries += [document_reference(d) for d in docs]
    entries += [record_resource(r) for r in records if r.status == "verified"]
    return {
        "resourceType": "Bundle", "type": "collection",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "entry": [{"fullUrl": f"urn:uuid:{e['id']}", "resource": e} for e in entries],
    }
