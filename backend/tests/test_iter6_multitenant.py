"""Iteration 6 backend tests: Multi-tenant SuperAdmin endpoints + public enrollment with tenant_slug."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

SUPERADMIN = {"email": "superadmin@nido.app", "password": "SuperAdmin2026!"}
ADMIN = {"email": "admin@scuolapp.it", "password": "Admin2026!"}
PARENT = {"email": "genitore@scuolapp.it", "password": "Genitore2026!"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()


def _h(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def sa_token():
    return _login(SUPERADMIN)["access_token"]


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN)["access_token"]


@pytest.fixture(scope="module")
def parent_token():
    return _login(PARENT)["access_token"]


@pytest.fixture(scope="module")
def created_tenant(sa_token):
    """Create an ephemeral tenant for these tests, delete in teardown."""
    ts = int(time.time())
    slug = f"test-scuola-{ts}"
    payload = {
        "name": f"TEST_Scuola_{ts}",
        "slug": slug,
        "contact_email": f"admin_{ts}@example.com",
        "admin_first_name": "TestAdmin",
        "admin_last_name": "Cognome",
        "plan": "basic",
    }
    r = requests.post(f"{API}/superadmin/tenants", json=payload, headers=_h(sa_token), timeout=20)
    assert r.status_code == 200, f"Create tenant: {r.status_code} {r.text}"
    body = r.json()
    assert body.get("ok") is True
    assert "tenant_id" in body and body.get("slug") == slug
    body["tenant"] = {"id": body["tenant_id"], "slug": body["slug"]}
    yield body
    # teardown
    try:
        tid = body["tenant"]["id"]
        requests.delete(f"{API}/superadmin/tenants/{tid}", headers=_h(sa_token), timeout=15)
    except Exception:
        pass


class TestSuperAdminAuth:
    def test_superadmin_login(self):
        r = requests.post(f"{API}/auth/login", json=SUPERADMIN, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["user"]["role"] == "superadmin"
        assert body["user"]["email"] == SUPERADMIN["email"]

    def test_admin_cannot_access_superadmin(self, admin_token):
        r = requests.get(f"{API}/superadmin/tenants", headers=_h(admin_token), timeout=15)
        assert r.status_code == 403

    def test_parent_cannot_access_superadmin(self, parent_token):
        r = requests.get(f"{API}/superadmin/tenants", headers=_h(parent_token), timeout=15)
        assert r.status_code == 403

    def test_no_auth_blocked(self):
        r = requests.get(f"{API}/superadmin/tenants", timeout=15)
        assert r.status_code in (401, 403)


class TestSuperAdminTenants:
    def test_list_contains_demo(self, sa_token):
        r = requests.get(f"{API}/superadmin/tenants", headers=_h(sa_token), timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        demo = next((t for t in items if t.get("slug") == "demo"), None)
        assert demo is not None, "demo tenant not in list"
        # stats expected
        assert "stats" in demo
        assert "students" in demo["stats"]
        assert "users" in demo["stats"]
        assert demo.get("name") == "L'Albero della Vita"

    def test_create_tenant_returns_invite_link(self, created_tenant):
        body = created_tenant
        assert "invite_link" in body
        assert "setup-password" in body["invite_link"]

    def test_new_tenant_in_list(self, sa_token, created_tenant):
        tid = created_tenant["tenant"]["id"]
        r = requests.get(f"{API}/superadmin/tenants", headers=_h(sa_token), timeout=15)
        items = r.json()
        match = next((t for t in items if t["id"] == tid), None)
        assert match is not None
        assert match["status"] == "active"
        assert match["stats"]["students"] == 0
        assert match["stats"]["users"] >= 1

    def test_suspend_and_reactivate(self, sa_token, created_tenant):
        tid = created_tenant["tenant"]["id"]
        # suspend
        r = requests.patch(f"{API}/superadmin/tenants/{tid}",
                           json={"status": "suspended"},
                           headers=_h(sa_token), timeout=15)
        assert r.status_code == 200
        # verify
        items = requests.get(f"{API}/superadmin/tenants", headers=_h(sa_token), timeout=15).json()
        match = next(t for t in items if t["id"] == tid)
        assert match["status"] == "suspended"
        # reactivate
        r2 = requests.patch(f"{API}/superadmin/tenants/{tid}",
                            json={"status": "active"},
                            headers=_h(sa_token), timeout=15)
        assert r2.status_code == 200

    def test_public_enrollment_with_new_tenant_slug(self, created_tenant):
        slug = created_tenant["tenant"]["slug"]
        payload = {
            "student_first_name": "TEST_Bambino",
            "student_last_name": "TEST_Cognome",
            "student_birth_date": "2021-05-10",
            "parent_first_name": "Mario",
            "parent_last_name": "Test",
            "parent_email": f"mt_{int(time.time())}@example.com",
        }
        r = requests.post(f"{API}/public/enrollment-requests",
                          params={"tenant_slug": slug}, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert "id" in body

    def test_public_enrollment_with_invalid_slug(self):
        payload = {
            "student_first_name": "x", "student_last_name": "y",
            "student_birth_date": "2021-01-01",
            "parent_first_name": "a", "parent_last_name": "b",
            "parent_email": f"x_{int(time.time())}@example.com",
        }
        r = requests.post(f"{API}/public/enrollment-requests",
                          params={"tenant_slug": "nope-does-not-exist-xyz"}, json=payload, timeout=15)
        assert r.status_code in (404, 400)


class TestPublicSchoolProfile:
    def test_default_demo_slug(self):
        r = requests.get(f"{API}/public/school-profile", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("name") == "L'Albero della Vita"
        assert d.get("slug") == "demo"

    def test_with_explicit_slug(self):
        r = requests.get(f"{API}/public/school-profile",
                         params={"tenant_slug": "demo"}, timeout=15)
        assert r.status_code == 200
