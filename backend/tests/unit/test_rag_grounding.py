from app.services.rag import Context, _numbers, check_grounding, strip_citations

CTX = {
    "R1": Context("R1", "a", "Lab result: Hemoglobin 10.2 g/dL (low, reference 12-15.5) on 2026-03-14."),
    "R2": Context("R2", "b", "Medication: Metformin 500 mg twice daily, recorded 2026-03-14."),
}


def test_grounded_answer_passes():
    valid, problems = check_grounding("Your hemoglobin was 10.2 g/dL on 2026-03-14, which is low [R1].", ["R1"], CTX)
    assert valid == ["R1"] and problems == []


def test_inline_citations_count_even_if_list_empty():
    valid, problems = check_grounding("You take Metformin 500 mg [R2].", [], CTX)
    assert valid == ["R2"] and not problems


def test_unknown_citation_flagged():
    _, problems = check_grounding("Value 10.2 [R1][R9].", ["R1", "R9"], CTX)
    assert any("R9" in p for p in problems)


def test_no_citation_flagged():
    _, problems = check_grounding("Your hemoglobin is fine.", [], CTX)
    assert "no valid citations" in problems


def test_hallucinated_number_flagged():
    _, problems = check_grounding("Your hemoglobin was 11.8 g/dL [R1].", ["R1"], CTX)
    assert any("11.8" in p for p in problems)


def test_number_from_uncited_record_flagged():
    # 500 exists in R2 but only R1 is cited -> not allowed
    _, problems = check_grounding("Hemoglobin 10.2, metformin 500 mg [R1].", ["R1"], CTX)
    assert any("500" in p for p in problems)


def test_numbers_from_question_allowed():
    _, problems = check_grounding("In the last 6 months your hemoglobin was 10.2 [R1].", ["R1"], CTX, question="last 6 months?")
    assert problems == []


def test_indic_digits_normalised():
    assert _numbers("हीमोग्लोबिन १०.२ था") == {10.2}
    _, problems = check_grounding("आपका हीमोग्लोबिन १०.२ g/dL था [R1]।", ["R1"], CTX)
    assert problems == []


def test_citation_labels_not_counted_as_numbers():
    assert _numbers("value [R1] [R12]") == set()


def test_strip_citations_for_speech():
    assert strip_citations("Hemoglobin 10.2 [R1]. Metformin [R2][R3].") == "Hemoglobin 10.2. Metformin."
