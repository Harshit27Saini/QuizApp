import io
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_user_collection_isolation_e2e():
    # 1. Register User A (Alice)
    alice_resp = client.post("/api/v1/auth/signup", json={
        "email": "alice_privacy@test.local",
        "password": "password123",
        "display_name": "Alice"
    })
    assert alice_resp.status_code == 201
    alice_token = alice_resp.json()["token"]
    alice_headers = {"Authorization": f"Bearer {alice_token}"}

    # 2. Register User B (Bob, the friend)
    bob_resp = client.post("/api/v1/auth/signup", json={
        "email": "bob_friend@test.local",
        "password": "password123",
        "display_name": "Bob Friend"
    })
    assert bob_resp.status_code == 201
    bob_token = bob_resp.json()["token"]
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    # 3. Alice creates a private collection
    alice_coll = client.post(
        "/api/v1/collections",
        json={"title": "Alice Confidential Biology", "description": "Private study material"},
        headers=alice_headers
    ).json()
    alice_coll_id = alice_coll["id"]

    # 4. Bob creates his own collection
    bob_coll = client.post(
        "/api/v1/collections",
        json={"title": "Bob History 101", "description": "World History notes"},
        headers=bob_headers
    ).json()
    bob_coll_id = bob_coll["id"]

    # 5. Verify Alice only sees her collection
    alice_list = client.get("/api/v1/collections", headers=alice_headers).json()
    alice_coll_ids = [c["id"] for c in alice_list]
    assert alice_coll_id in alice_coll_ids
    assert bob_coll_id not in alice_coll_ids

    # 6. Verify Bob (friend) ONLY sees his collection, NEVER Alice's collection
    bob_list = client.get("/api/v1/collections", headers=bob_headers).json()
    bob_coll_ids = [c["id"] for c in bob_list]
    assert bob_coll_id in bob_coll_ids
    assert alice_coll_id not in bob_coll_ids
    assert not any("Alice Confidential" in c["title"] for c in bob_list)

    # 7. Bob attempts direct access to Alice's collection via GET /collections/{id}
    # MUST return 404 Not Found (or 403 Forbidden) and NOT leak Alice's data or hijack the collection
    bob_direct_access = client.get(f"/api/v1/collections/{alice_coll_id}", headers=bob_headers)
    assert bob_direct_access.status_code == 404

    # 8. Bob attempts to upload a document to Alice's collection
    files = {"file": ("bob_notes.txt", io.BytesIO(b"Injected text"), "text/plain")}
    bob_inject = client.post(
        f"/api/v1/collections/{alice_coll_id}/documents",
        files=files,
        headers=bob_headers
    )
    assert bob_inject.status_code == 404

    # 9. Bob cannot list documents of Alice's collection
    bob_list_docs = client.get(
        f"/api/v1/collections/{alice_coll_id}/documents",
        headers=bob_headers
    )
    assert bob_list_docs.status_code == 200
    assert bob_list_docs.json() == []

    # 10. Verify Bob passing ?all_users=true cannot bypass isolation
    bob_bypass_attempt = client.get("/api/v1/collections?all_users=true", headers=bob_headers).json()
    bob_bypass_ids = [c["id"] for c in bob_bypass_attempt]
    assert alice_coll_id not in bob_bypass_ids


def test_guest_user_isolation():
    guest_1_headers = {"X-User-Id": "guest_alice_device_999"}
    guest_2_headers = {"X-User-Id": "guest_bob_device_888"}

    # Guest 1 creates a collection
    g1_coll = client.post(
        "/api/v1/collections",
        json={"title": "Guest 1 Private Draft", "description": "Draft notes"},
        headers=guest_1_headers
    ).json()
    g1_coll_id = g1_coll["id"]

    # Guest 2 lists collections
    g2_list = client.get("/api/v1/collections", headers=guest_2_headers).json()
    g2_coll_ids = [c["id"] for c in g2_list]

    # Guest 2 MUST NOT see Guest 1's collection!
    assert g1_coll_id not in g2_coll_ids
    assert not any("Guest 1 Private Draft" in c.get("title", "") for c in g2_list)

    # Guest 2 direct access must fail
    g2_access = client.get(f"/api/v1/collections/{g1_coll_id}", headers=guest_2_headers)
    assert g2_access.status_code == 404
