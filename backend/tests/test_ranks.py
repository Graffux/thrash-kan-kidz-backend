"""Unit tests for compute_user_rank."""
from data.ranks import compute_user_rank, RANKS


def test_no_series_cleared_is_poser():
    assert compute_user_rank([])["id"] == "poser"
    assert compute_user_rank(None)["id"] == "poser"


def test_one_series_cleared_is_roadie():
    assert compute_user_rank([1])["id"] == "roadie"


def test_three_series_cleared_is_tape_trader():
    assert compute_user_rank([1, 2, 3])["id"] == "tape_trader"


def test_completed_series_with_duplicates_dedupes():
    # Defensive: historical data sometimes contains duplicates.
    assert compute_user_rank([1, 1, 2, 2, 3])["id"] == "tape_trader"


def test_all_seven_series_cleared_is_stage_diver():
    assert compute_user_rank([1, 2, 3, 4, 5, 6, 7])["id"] == "stage_diver"


def test_all_eight_series_cleared_is_thrash_maniac():
    assert compute_user_rank([1, 2, 3, 4, 5, 6, 7, 8])["id"] == "thrash_maniac"


def test_rank_progression_is_monotonic():
    # Each successive rank must require at least as many cleared series.
    thresholds = [r["min_series_cleared"] for r in RANKS]
    assert thresholds == sorted(thresholds)
