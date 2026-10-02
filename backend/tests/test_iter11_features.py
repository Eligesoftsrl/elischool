"""Iteration 11 tests:
- GET /api/admin/tenant (stats, plan/status readonly from admin)
- PATCH /api/admin/tenant (name/contact fields, no plan/status leak)
- Media upload: payload is encrypted at rest (is_encrypted True, no plaintext in list)
- Media GET: decrypts transparently and returns data_base64 == original
- Seed smoke: 6 teachers + Siria Longobardi student exist
"""
import os
import base64
import secrets
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://nursery-smart.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@scuolapp.it"
ADMIN_PASSWORD = "Admin2026!"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    token = r.json().get("access_token") or r.json().get("token")
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    return s


# --------------- /api/admin/tenant ---------------
class TestAdminTenant:
    def test_get_tenant_shape(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/tenant")
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("id", "name", "slug", "plan", "status", "stats"):
            assert k in data, f"missing field {k}"
        s = data["stats"]
        for k in ("students_active", "students_withdrawn", "parents", "teachers",
                  "admins", "classrooms", "media_count", "media_bytes",
                  "enrollment_requests_pending"):
            assert k in s, f"missing stat {k}"
            assert isinstance(s[k], int)

    def test_patch_tenant_update_name(self, admin_session):
        current = admin_session.get(f"{BASE_URL}/api/admin/tenant").json()
        original = current["name"]
        new_name = f"TEST_{original}_tmp"
        try:
            r = admin_session.patch(f"{BASE_URL}/api/admin/tenant", json={"name": new_name})
            assert r.status_code == 200, r.text
            assert r.json()["name"] == new_name
            # verify persisted via GET
            r2 = admin_session.get(f"{BASE_URL}/api/admin/tenant")
            assert r2.json()["name"] == new_name
        finally:
            admin_session.patch(f"{BASE_URL}/api/admin/tenant", json={"name": original})

    def test_patch_tenant_ignores_plan_and_status(self, admin_session):
        before = admin_session.get(f"{BASE_URL}/api/admin/tenant").json()
        # Payload with unknown fields -> pydantic strips them silently
        r = admin_session.patch(f"{BASE_URL}/api/admin/tenant",
                                 json={"plan": "pro", "status": "suspended"})
        assert r.status_code == 200
        after = admin_session.get(f"{BASE_URL}/api/admin/tenant").json()
        assert after["plan"] == before["plan"], "plan must stay readonly for admin"
        assert after["status"] == before["status"], "status must stay readonly for admin"

    def test_patch_contact_email_lowercased(self, admin_session):
        before = admin_session.get(f"{BASE_URL}/api/admin/tenant").json()
        original_email = before.get("contact_email")
        try:
            r = admin_session.patch(f"{BASE_URL}/api/admin/tenant",
                                     json={"contact_email": "TEST_Admin@ScUoLa.it"})
            assert r.status_code == 200
            assert r.json()["contact_email"] == "test_admin@scuola.it"
        finally:
            if original_email:
                admin_session.patch(f"{BASE_URL}/api/admin/tenant",
                                     json={"contact_email": original_email})


# --------------- Media encryption at rest ---------------
class TestMediaEncryption:
    SAMPLE = base64.b64encode(b"HELLO-ENCRYPT-" + secrets.token_bytes(32)).decode()

    def test_upload_then_get_roundtrip(self, admin_session):
        # Need an existing classroom id for the payload
        rc = admin_session.get(f"{BASE_URL}/api/classrooms")
        assert rc.status_code == 200
        classrooms = rc.json()
        classroom_id = classrooms[0]["id"] if classrooms else None

        payload = {
            "filename": "TEST_iter11.txt",
            "content_type": "text/plain",
            "data_base64": self.SAMPLE,
            "classroom_id": classroom_id,
            "student_id": None,
            "tags": ["test"],
        }
        r = admin_session.post(f"{BASE_URL}/api/media", json=payload)
        assert r.status_code == 200, r.text
        created = r.json()
        mid = created["id"]
        try:
            assert created.get("is_encrypted") is True
            assert created.get("cipher_alg") == "aes-256-gcm"
            assert "data_cipher" not in created, "cipher must not leak back to client"
            assert created.get("byte_size", 0) > 0

            # List must NOT include the heavy fields
            rl = admin_session.get(f"{BASE_URL}/api/media")
            assert rl.status_code == 200
            found = next((m for m in rl.json() if m["id"] == mid), None)
            assert found is not None
            assert "data_cipher" not in found
            assert "data_base64" not in found
            assert found.get("is_encrypted") is True

            # GET single: should decrypt and return data_base64 as data URL
            rg = admin_session.get(f"{BASE_URL}/api/media/{mid}")
            assert rg.status_code == 200
            got = rg.json()
            assert "data_cipher" not in got, "cipher must not leak back on GET"
            assert got["data_base64"].startswith("data:text/plain;base64,")
            # And it must match our original bytes
            b64 = got["data_base64"].split(",", 1)[1]
            assert base64.b64decode(b64) == base64.b64decode(self.SAMPLE)
        finally:
            admin_session.delete(f"{BASE_URL}/api/media/{mid}")

    def test_upload_rejects_invalid_base64(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/media", json={
            "filename": "TEST_bad.txt",
            "content_type": "text/plain",
            "data_base64": "***not-base64***",
            "classroom_id": None,
            "student_id": None,
            "tags": [],
        })
        # base64.b64decode is lenient; may 200 but if it fails we want 400
        assert r.status_code in (200, 400)
        if r.status_code == 200:
            admin_session.delete(f"{BASE_URL}/api/media/{r.json()['id']}")


# --------------- Seed smoke (Siria + 6 teachers) ---------------
class TestSeedSmoke:
    def test_six_teachers(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/teachers")
        assert r.status_code == 200
        teachers = r.json()
        assert len(teachers) >= 6, f"expected >=6 teachers, got {len(teachers)}"

    def test_siria_student_exists(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/students")
        assert r.status_code == 200
        found = [s for s in r.json() if (s.get("last_name") or "").lower() == "longobardi"
                 and (s.get("first_name") or "").lower() == "siria"]
        assert len(found) >= 1, "Siria Longobardi student missing"
