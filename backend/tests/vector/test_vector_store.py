"""Qdrant behaviour against a real (in-process) Qdrant engine."""
import uuid
from datetime import date

import pytest

from app.models import ClinicalRecord
from app.services.fakes import hash_embed
from app.services.vector_store import VectorStore, record_to_text

DIM = 64


def rec(patient="p1", kind="lab_result", name="Hemoglobin", d=date(2026, 3, 14), status="verified", **kw):
    base = dict(id=str(uuid.uuid4()), patient_id=patient, document_id="d1", kind=kind, name=name, value_num=10.2, unit="g/dL",
                ref_low=12.0, ref_high=15.5, flag="low", effective_date=d, status=status, value_text=None, dose=None, frequency=None)
    return ClinicalRecord(**(base | kw))


@pytest.fixture
def store():
    s = VectorStore(":memory:", None, f"t_{uuid.uuid4().hex[:8]}", DIM)
    s.ensure_collection()
    s.ensure_collection()  # idempotent
    return s


def index(store, recs):
    texts = [record_to_text(r) for r in recs]
    store.upsert(recs, texts, [hash_embed(t, DIM) for t in texts])


def q(text):
    return hash_embed(text, DIM)


def test_record_to_text_variants():
    assert record_to_text(rec(), "cbc.pdf") == "Lab result: Hemoglobin 10.2 g/dL (low, reference 12-15.5) on 2026-03-14. Source: cbc.pdf."
    med = rec(kind="medication", name="Metformin", value_num=None, unit=None, dose="500 mg", frequency="twice daily", flag=None)
    assert record_to_text(med) == "Medication: Metformin 500 mg twice daily, recorded 2026-03-14."
    cond = rec(kind="condition", name="Type 2 diabetes", value_num=None, effective_date=None)
    assert record_to_text(cond) == "Condition: Type 2 diabetes, recorded date unknown."
    upper = rec(ref_low=None, ref_high=200.0, name="LDL cholesterol", value_num=162.0, unit="mg/dL", flag="high")
    assert "reference below 200" in record_to_text(upper)


def test_semantic_ranking(store):
    hb, met, ldl = rec(), rec(kind="medication", name="Metformin", dose="500 mg", frequency="twice daily", value_num=None), rec(name="LDL cholesterol", value_num=162.0)
    index(store, [hb, met, ldl])
    hits = store.search("p1", q("what was my hemoglobin"), limit=3)
    assert hits[0].record_id == hb.id
    assert hits[0].score >= hits[-1].score
    assert store.search("p1", q("which medication do I take"), limit=1)[0].record_id == met.id


def test_patient_isolation(store):
    mine, theirs = rec(patient="p1"), rec(patient="p2")
    index(store, [mine, theirs])
    ids = {h.record_id for h in store.search("p1", q("hemoglobin"), limit=10)}
    assert ids == {mine.id}
    assert {h.record_id for h in store.search("p2", q("hemoglobin"), limit=10)} == {theirs.id}
    assert store.search("p3", q("hemoglobin"), limit=10) == []


def test_patient_id_is_mandatory(store):
    with pytest.raises(ValueError):
        store.search("", q("x"))


def test_kind_and_date_filters(store):
    old, new = rec(d=date(2025, 1, 1)), rec(d=date(2026, 8, 1))
    med = rec(kind="medication", name="Metformin", d=date(2026, 8, 1))
    index(store, [old, new, med])
    assert {h.record_id for h in store.search("p1", q("hemoglobin"), kinds=["lab_result"], limit=10)} == {old.id, new.id}
    assert {h.record_id for h in store.search("p1", q("hemoglobin"), date_from=date(2026, 1, 1), limit=10)} == {new.id, med.id}
    assert {h.record_id for h in store.search("p1", q("hemoglobin"), date_to=date(2025, 12, 31), limit=10)} == {old.id}


def test_score_threshold(store):
    index(store, [rec()])
    assert store.search("p1", q("completely unrelated astronomy question"), score_threshold=0.9) == []


def test_upsert_is_idempotent(store):
    r = rec()
    index(store, [r])
    index(store, [r])
    assert store.count("p1") == 1


def test_refuses_unverified(store):
    r = rec(status="needs_review")
    with pytest.raises(ValueError):
        store.upsert([r], ["x"], [q("x")])


def test_delete_and_delete_patient(store):
    a, b, c = rec(), rec(), rec(patient="p2")
    index(store, [a, b, c])
    store.delete([a.id])
    assert store.count("p1") == 1
    store.delete([])  # no-op
    store.delete_patient("p1")
    assert store.count("p1") == 0 and store.count("p2") == 1


def test_payload_contents(store):
    r = rec()
    index(store, [r])
    [h] = store.search("p1", q("hemoglobin"))
    assert h.payload["patient_id"] == "p1" and h.payload["kind"] == "lab_result" and h.payload["date"] == "2026-03-14"
    assert h.text.startswith("Lab result: Hemoglobin")


def test_local_vectors_survive_restart(tmp_path):
    path = str(tmp_path / "vectors")
    first = VectorStore(":memory:", None, "persistent", DIM, local_path=path)
    first.ensure_collection()
    r = rec()
    index(first, [r])
    first.client.close()
    second = VectorStore(":memory:", None, "persistent", DIM, local_path=path)
    try:
        second.ensure_collection()
        assert second.search("p1", q("hemoglobin"))[0].record_id == r.id
        assert second.search("p2", q("hemoglobin")) == []
    finally:
        second.client.close()
