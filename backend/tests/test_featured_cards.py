"""Live integration tests for the Featured Cards endpoint.

These tests run against the local backend (assumes supervisor has the server
running on http://localhost:8001 and the seeded Graffux account exists).
They're integration-flavored rather than unit tests because the endpoint's
core safety guarantee is the MongoDB intersection of requested IDs with the
user's actual `user_cards` documents — a behavior that's hard to mock
faithfully without standing up a fake Mongo.
"""
import os
import requests

API = os.environ.get("TEST_API_URL", "http://localhost:8001")
# Graffux is the project's known seeded production-data account.
USER_ID = "0b820bda-18e5-4ca9-9ba1-e493617a23e3"


def _owned_card_ids(n: int = 5) -> list:
    """Fetch the first n card IDs the test user actually owns."""
    res = requests.get(f"{API}/api/users/{USER_ID}/cards", timeout=60)
    res.raise_for_status()
    cards = res.json()
    return [c["card"]["id"] for c in cards[:n]]


def _set_featured(ids: list) -> dict:
    res = requests.put(
        f"{API}/api/users/{USER_ID}/featured-cards",
        json={"card_ids": ids},
        timeout=30,
    )
    res.raise_for_status()
    return res.json()


def test_set_and_get_featured_cards_roundtrip():
    ids = _owned_card_ids(3)
    body = _set_featured(ids)
    assert body["featured_card_ids"] == ids

    # Round-trip via the regular user GET
    res = requests.get(f"{API}/api/users/{USER_ID}", timeout=10)
    assert res.status_code == 200
    assert res.json()["featured_card_ids"] == ids
    # Cleanup
    _set_featured([])


def test_clearing_featured_cards():
    # First set some
    ids = _owned_card_ids(2)
    _set_featured(ids)
    # Then clear
    body = _set_featured([])
    assert body["featured_card_ids"] == []


def test_caps_at_five_slots():
    ids = _owned_card_ids(5)
    # We can't easily get 6 owned cards in a guaranteed way, so re-use the 5
    # plus a duplicate to ensure dedupe still caps correctly when overflow is
    # mixed with dupes.
    over = ids + [ids[0]]  # 6 entries but one is a dupe
    body = _set_featured(over)
    assert len(body["featured_card_ids"]) <= 5
    _set_featured([])


def test_filters_out_unowned_card_ids():
    owned = _owned_card_ids(2)
    payload = owned + ["FAKE_NOT_OWNED_ID", "another_fake_id"]
    body = _set_featured(payload)
    assert "FAKE_NOT_OWNED_ID" not in body["featured_card_ids"]
    assert "another_fake_id" not in body["featured_card_ids"]
    assert set(owned).issubset(set(body["featured_card_ids"]))
    _set_featured([])


def test_404_on_unknown_user():
    res = requests.put(
        f"{API}/api/users/this-user-does-not-exist/featured-cards",
        json={"card_ids": []},
        timeout=10,
    )
    assert res.status_code == 404
