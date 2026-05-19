"""Extended integration tests for the Featured Cards endpoint.

Covers the additional scenarios requested by the review:
- Fresh-user (non-seeded) flow - confirms the endpoint isn't tied to Graffux.
- Empty fresh user gets an empty featured list with no crashes.
- Filtering even when the user owns nothing.
- Very long card_ids list still capped at 5.
- Special-character IDs are safely filtered (no MongoDB injection / crash).
- Existing GET /api/users/{id} still serializes correctly with the new field.
- Regression: register/login round-trip + ranks/badges endpoints still respond.
"""
import os
import uuid
import requests
import pytest

# Hit the public preview URL to mirror what the real client sees
API = os.environ.get(
    "TEST_API_URL",
    os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001"),
).rstrip("/")

GRAFFUX_ID = "0b820bda-18e5-4ca9-9ba1-e493617a23e3"


# ---------- Helpers ----------

def _register_fresh_user():
    """Register a brand-new throw-away user and return their dict."""
    username = f"TEST_feat_{uuid.uuid4().hex[:10]}"
    res = requests.post(
        f"{API}/api/auth/register",
        json={"username": username, "password": "Thrashpw06!"},
        timeout=30,
    )
    assert res.status_code == 200, f"register failed: {res.status_code} {res.text}"
    data = res.json()
    assert "id" in data
    return data, username


def _owned_card_ids(user_id: str, n: int = 5) -> list:
    res = requests.get(f"{API}/api/users/{user_id}/cards", timeout=60)
    res.raise_for_status()
    cards = res.json()
    return [c["card"]["id"] for c in cards[:n]]


def _set_featured(user_id: str, ids: list) -> requests.Response:
    return requests.put(
        f"{API}/api/users/{user_id}/featured-cards",
        json={"card_ids": ids},
        timeout=30,
    )


# ---------- New-user (non-seeded) coverage ----------

class TestFreshUserFeaturedCards:
    """The endpoint must work for any user, not just the seeded Graffux account."""

    def test_register_then_user_has_empty_featured_field(self):
        user, _ = _register_fresh_user()
        # Newly created users should have the field default to empty list
        assert user.get("featured_card_ids") == []

        # And the GET endpoint should also return the field
        got = requests.get(f"{API}/api/users/{user['id']}", timeout=15)
        assert got.status_code == 200
        body = got.json()
        assert "featured_card_ids" in body
        assert body["featured_card_ids"] == []

    def test_fresh_user_with_no_cards_filters_everything(self):
        """A user with zero owned cards: any supplied ids should be filtered out."""
        user, _ = _register_fresh_user()
        res = _set_featured(user["id"], ["any", "ids", "here"])
        assert res.status_code == 200
        body = res.json()
        # User owns nothing, so validated list must be empty
        assert body["featured_card_ids"] == []

        # Persistence check
        got = requests.get(f"{API}/api/users/{user['id']}", timeout=15)
        assert got.status_code == 200
        assert got.json()["featured_card_ids"] == []

    def test_fresh_user_clear_empty_list_idempotent(self):
        user, _ = _register_fresh_user()
        # Clearing an already-empty list should be a no-op success
        for _ in range(2):
            res = _set_featured(user["id"], [])
            assert res.status_code == 200
            assert res.json()["featured_card_ids"] == []


# ---------- Edge cases on the seeded user (who actually owns cards) ----------

class TestEdgeCasesOnSeededUser:
    """Tests that need a user with real owned cards in MongoDB."""

    def _restore(self):
        # Always leave Graffux with an empty showcase to keep tests isolated.
        _set_featured(GRAFFUX_ID, [])

    def teardown_method(self, _method):
        self._restore()

    def test_very_long_card_ids_list_capped_at_five(self):
        owned = _owned_card_ids(GRAFFUX_ID, 5)
        # Send 200 entries (mix of real + fake) — server must cap to 5 cleanly.
        payload = (owned * 20) + [f"fake_id_{i}" for i in range(100)]
        res = _set_featured(GRAFFUX_ID, payload)
        assert res.status_code == 200
        body = res.json()
        assert len(body["featured_card_ids"]) <= 5
        # All returned ids should be ones the user actually owns
        assert set(body["featured_card_ids"]).issubset(set(owned))

    def test_special_character_card_ids_are_filtered_safely(self):
        owned = _owned_card_ids(GRAFFUX_ID, 1)
        weird = [
            "../../etc/passwd",
            "{\"$ne\": null}",
            "'; DROP TABLE users;--",
            "<script>alert(1)</script>",
            "🦴💀🔥",
            "",  # empty string id
        ]
        res = _set_featured(GRAFFUX_ID, owned + weird)
        assert res.status_code == 200, res.text
        body = res.json()
        # Only the truly-owned id should survive
        assert body["featured_card_ids"] == owned
        # Re-fetch to confirm the weird ids did not somehow land in mongo
        got = requests.get(f"{API}/api/users/{GRAFFUX_ID}", timeout=15)
        assert got.status_code == 200
        assert got.json()["featured_card_ids"] == owned

    def test_user_get_serializes_with_featured_field_after_set(self):
        owned = _owned_card_ids(GRAFFUX_ID, 2)
        assert _set_featured(GRAFFUX_ID, owned).status_code == 200

        got = requests.get(f"{API}/api/users/{GRAFFUX_ID}", timeout=15)
        assert got.status_code == 200
        body = got.json()
        # Field present, correct values, and other required user fields untouched
        assert body["featured_card_ids"] == owned
        for required in ("id", "username", "coins", "rank"):
            assert required in body, f"missing {required} after featured update"

    def test_dedupe_preserves_first_occurrence_order(self):
        owned = _owned_card_ids(GRAFFUX_ID, 3)
        if len(owned) < 3:
            pytest.skip("seeded user needs >=3 owned cards for this assertion")
        # Mix order with duplicates: c0, c1, c0, c2, c1 -> [c0, c1, c2]
        payload = [owned[0], owned[1], owned[0], owned[2], owned[1]]
        res = _set_featured(GRAFFUX_ID, payload)
        assert res.status_code == 200
        assert res.json()["featured_card_ids"] == [owned[0], owned[1], owned[2]]


# ---------- Regression: existing endpoints still work with the new field ----------

class TestUserModelRegression:

    def test_get_user_still_works(self):
        res = requests.get(f"{API}/api/users/{GRAFFUX_ID}", timeout=15)
        assert res.status_code == 200
        body = res.json()
        assert body["id"] == GRAFFUX_ID
        # featured_card_ids must be present (new field) even if empty
        assert "featured_card_ids" in body
        assert isinstance(body["featured_card_ids"], list)

    def test_register_and_login_roundtrip(self):
        user, username = _register_fresh_user()
        # featured_card_ids on register response
        assert user.get("featured_card_ids") == []

        login = requests.post(
            f"{API}/api/auth/login",
            json={"username": username, "password": "Thrashpw06!"},
            timeout=15,
        )
        assert login.status_code == 200, login.text
        ldata = login.json()
        assert ldata["id"] == user["id"]
        assert "featured_card_ids" in ldata
        assert ldata["featured_card_ids"] == []

    def test_ranks_endpoint(self):
        res = requests.get(f"{API}/api/ranks", timeout=15)
        assert res.status_code == 200
        body = res.json()
        assert "ranks" in body
        assert isinstance(body["ranks"], list)
        assert len(body["ranks"]) > 0

    def test_user_badges_endpoint(self):
        res = requests.get(f"{API}/api/users/{GRAFFUX_ID}/badges", timeout=30)
        assert res.status_code == 200
        body = res.json()
        assert "badges" in body
        assert "earned_count" in body

    def test_user_cards_endpoint_still_returns_owned(self):
        res = requests.get(f"{API}/api/users/{GRAFFUX_ID}/cards", timeout=60)
        assert res.status_code == 200
        cards = res.json()
        assert isinstance(cards, list)
        if cards:
            assert "card" in cards[0]
            assert "id" in cards[0]["card"]


# ---------- 404 / error path ----------

class TestErrorPaths:
    def test_404_on_unknown_user(self):
        res = _set_featured(f"missing-{uuid.uuid4().hex}", [])
        assert res.status_code == 404

    def test_missing_card_ids_field_is_422(self):
        res = requests.put(
            f"{API}/api/users/{GRAFFUX_ID}/featured-cards",
            json={},
            timeout=15,
        )
        # FastAPI validation error
        assert res.status_code == 422

    def test_non_list_card_ids_is_422(self):
        res = requests.put(
            f"{API}/api/users/{GRAFFUX_ID}/featured-cards",
            json={"card_ids": "not-a-list"},
            timeout=15,
        )
        assert res.status_code == 422
