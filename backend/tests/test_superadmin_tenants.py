"""Backend tests for Superadmin tenant management (iteration_12)."""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

SUPERADMIN_EMAIL = "superadmin@nido.app"
SUPERADMIN_PASSWORD = "SuperAdmin2026!"
DEMO_TENANT_SLUG = "demo"
ORIGINAL_NAME = "L'Albero della Vita"
ORIGINAL_PLAN = "demo"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    r = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": SUPERADMIN_EMAIL, "password": SUPERADMIN_PASSWORD},
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    token = data.get("access_token") or data.get("token")
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="module")
def demo_tenant_id(session):
    r = session.get(f"{BASE_URL}/api/superadmin/tenants")
    assert r.status_code == 200
    tenants = r.json()
    demo = next((t for t in tenants if t.get("slug") == DEMO_TENANT_SLUG), None)
    assert demo is not None, "Demo tenant not found"
    return demo["id"]


class TestSuperadminTenantsList:
    def test_list_tenants_returns_stats(self, session):
        r = session.get(f"{BASE_URL}/api/superadmin/tenants")
        assert r.status_code == 200
        tenants = r.json()
        assert isinstance(tenants, list) and len(tenants) >= 1
        t = tenants[0]
        assert "stats" in t
        for key in ("students", "users", "classrooms", "enrollment_requests_pending"):
            assert key in t["stats"]
            assert isinstance(t["stats"][key], int)


class TestSuperadminGetTenant:
    def test_get_tenant_with_stats(self, session, demo_tenant_id):
        r = session.get(f"{BASE_URL}/api/superadmin/tenants/{demo_tenant_id}")
        assert r.status_code == 200
        t = r.json()
        assert t["id"] == demo_tenant_id
        assert t["slug"] == DEMO_TENANT_SLUG
        assert "stats" in t
        assert all(k in t["stats"] for k in ("students", "users", "classrooms", "enrollment_requests_pending"))
        assert "_id" not in t

    def test_get_tenant_404(self, session):
        r = session.get(f"{BASE_URL}/api/superadmin/tenants/nonexistent-id")
        assert r.status_code == 404


class TestSuperadminPatchTenant:
    def test_patch_updates_name_and_returns_stats(self, session, demo_tenant_id):
        new_name = "TEST_Updated Name"
        r = session.patch(
            f"{BASE_URL}/api/superadmin/tenants/{demo_tenant_id}",
            json={"name": new_name},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == new_name
        assert "stats" in data, "PATCH response must include stats (re-read via sa_get_tenant)"

        # Verify persistence via GET
        g = session.get(f"{BASE_URL}/api/superadmin/tenants/{demo_tenant_id}")
        assert g.status_code == 200
        assert g.json()["name"] == new_name

        # Restore
        r2 = session.patch(
            f"{BASE_URL}/api/superadmin/tenants/{demo_tenant_id}",
            json={"name": ORIGINAL_NAME},
        )
        assert r2.status_code == 200
        assert r2.json()["name"] == ORIGINAL_NAME

    def test_patch_plan_change(self, session, demo_tenant_id):
        r = session.patch(
            f"{BASE_URL}/api/superadmin/tenants/{demo_tenant_id}",
            json={"plan": "pro"},
        )
        assert r.status_code == 200
        assert r.json()["plan"] == "pro"
        assert "stats" in r.json()

        # Restore
        r2 = session.patch(
            f"{BASE_URL}/api/superadmin/tenants/{demo_tenant_id}",
            json={"plan": ORIGINAL_PLAN},
        )
        assert r2.status_code == 200
        assert r2.json()["plan"] == ORIGINAL_PLAN

    def test_patch_status_toggle(self, session, demo_tenant_id):
        r = session.patch(
            f"{BASE_URL}/api/superadmin/tenants/{demo_tenant_id}",
            json={"status": "suspended"},
        )
        assert r.status_code == 200
        assert r.json()["status"] == "suspended"

        r2 = session.patch(
            f"{BASE_URL}/api/superadmin/tenants/{demo_tenant_id}",
            json={"status": "active"},
        )
        assert r2.status_code == 200
        assert r2.json()["status"] == "active"

    def test_patch_logo_base64(self, session, demo_tenant_id):
        tiny_logo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEX///+nxBvIAAAAC0lEQVQI12NgAAIAAAUAAeImBZsAAAAASUVORK5CYII="
        r = session.patch(
            f"{BASE_URL}/api/superadmin/tenants/{demo_tenant_id}",
            json={"logo_base64": tiny_logo},
        )
        assert r.status_code == 200
        assert r.json()["logo_base64"] == tiny_logo

        # clear logo
        r2 = session.patch(
            f"{BASE_URL}/api/superadmin/tenants/{demo_tenant_id}",
            json={"logo_base64": ""},
        )
        assert r2.status_code == 200
        assert r2.json()["logo_base64"] == ""


class TestSuperadminDeleteProtected:
    def test_cannot_delete_default_tenant(self, session, demo_tenant_id):
        r = session.delete(f"{BASE_URL}/api/superadmin/tenants/{demo_tenant_id}")
        # DEFAULT_TENANT_ID is protected -> expect 400
        assert r.status_code in (400, 403), r.text


class TestSuperadminCreateAndDeleteTenant:
    def test_create_then_delete_tenant(self, session):
        payload = {
            "name": "TEST_Nido Prova",
            "slug": "test-nido-prova-del12",
            "contact_email": "testadmin-del12@example.com",
            "contact_phone": "",
            "address": "",
            "vat_number": "",
            "website": "",
            "logo_base64": "",
            "plan": "demo",
            "status": "active",
            "admin_first_name": "Mario",
            "admin_last_name": "Rossi",
        }
        r = session.post(f"{BASE_URL}/api/superadmin/tenants", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        tid = data["tenant_id"]
        assert "invite_link" in data

        # Verify GET works and includes stats
        g = session.get(f"{BASE_URL}/api/superadmin/tenants/{tid}")
        assert g.status_code == 200
        assert "stats" in g.json()

        # Clean up
        d = session.delete(f"{BASE_URL}/api/superadmin/tenants/{tid}")
        assert d.status_code == 200
        assert d.json().get("ok") is True

        # Confirm removed
        g2 = session.get(f"{BASE_URL}/api/superadmin/tenants/{tid}")
        assert g2.status_code == 404
