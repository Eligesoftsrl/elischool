"""Iteration 7 — CF obbligatorio + città di residenza (autocomplete comuni)."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://nursery-smart.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@scuolapp.it"
ADMIN_PWD = "Admin2026!"
PARENT_EMAIL = "genitore@scuolapp.it"
PARENT_PWD = "Genitore2026!"
SUPERADMIN_EMAIL = "superadmin@nido.app"
SUPERADMIN_PWD = "SuperAdmin2026!"

CF_NEW_1 = "VRDGNN90A41F205X"      # for public enrollment
CF_NEW_2 = "BNCMRC22A01H501X"      # for admin student creation
CF_ALICE = "ROSALI22A01H501A"      # existing seed


@pytest.fixture(scope="module")
def s_admin():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PWD})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def s_parent():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": PARENT_EMAIL, "password": PARENT_PWD})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def s_super():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": SUPERADMIN_EMAIL, "password": SUPERADMIN_PWD})
    assert r.status_code == 200, r.text
    return s


# --------------- Comuni autocomplete ---------------
class TestComuni:
    def test_comuni_basic(self):
        r = requests.get(f"{API}/public/comuni", params={"q": "mila"})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        names = [c["nome"] for c in data]
        assert any(n.lower().startswith("mila") for n in names), names
        # Milano should be one of them
        assert any(c["nome"] == "Milano" for c in data)
        # Shape check
        first = data[0]
        assert "nome" in first and "sigla" in first and "cap" in first

    def test_comuni_too_short(self):
        r = requests.get(f"{API}/public/comuni", params={"q": "m"})
        assert r.status_code == 200
        assert r.json() == []

    def test_comuni_empty_query(self):
        r = requests.get(f"{API}/public/comuni", params={"q": ""})
        assert r.status_code == 200
        assert r.json() == []

    def test_comuni_nonexistent(self):
        r = requests.get(f"{API}/public/comuni", params={"q": "zxqvwabc"})
        assert r.status_code == 200
        assert r.json() == []

    def test_comuni_no_auth_required(self):
        # Explicitly pass no cookies/headers
        r = requests.get(f"{API}/public/comuni?q=roma")
        assert r.status_code == 200
        assert any(c["nome"] == "Roma" for c in r.json())


# --------------- Public enrollment (CF + city) ---------------
class TestPublicEnrollment:
    def _payload(self, cf=CF_NEW_1, include_email=False, city="Milano (MI)"):
        p = {
            "student_first_name": "TEST_Giovanna",
            "student_last_name": "Verdi",
            "student_birth_date": "2020-05-15",
            "student_fiscal_code": cf,
            "parent_first_name": "Mario",
            "parent_last_name": "Verdi",
            "parent_phone": "3331234567",
            "city_residence": city,
            "address": "Via Roma 1",
            "notes": "TEST iter7",
        }
        if include_email:
            p["parent_email"] = "test_iter7_verdi@example.com"
        return p

    def test_enrollment_invalid_cf(self):
        payload = self._payload(cf="INVALID")
        r = requests.post(f"{API}/public/enrollment-requests", json=payload, params={"tenant_slug": "demo"})
        assert r.status_code == 400
        assert "Fiscale" in r.text or "fiscal" in r.text.lower()

    def test_enrollment_valid_no_email(self):
        payload = self._payload()
        r = requests.post(f"{API}/public/enrollment-requests", json=payload, params={"tenant_slug": "demo"})
        assert r.status_code in (200, 201), r.text
        j = r.json()
        assert j.get("ok") is True
        assert "id" in j

    def test_enrollment_duplicate_cf(self):
        # Second POST with same CF
        payload = self._payload()
        r = requests.post(f"{API}/public/enrollment-requests", json=payload, params={"tenant_slug": "demo"})
        assert r.status_code == 400
        assert "attesa" in r.text.lower() or "già" in r.text or "duplicat" in r.text.lower()

    def test_enrollment_missing_city(self):
        payload = self._payload(cf="RSSMRA85M01H501Z")
        del payload["city_residence"]
        r = requests.post(f"{API}/public/enrollment-requests", json=payload, params={"tenant_slug": "demo"})
        assert r.status_code == 422

    def test_enrollment_missing_phone(self):
        payload = self._payload(cf="RSSMRA85M01H501Z")
        del payload["parent_phone"]
        r = requests.post(f"{API}/public/enrollment-requests", json=payload, params={"tenant_slug": "demo"})
        assert r.status_code == 422


# --------------- Admin: POST /students with CF ---------------
class TestAdminStudentCF:
    def test_invalid_cf_rejected(self, s_admin):
        payload = {
            "first_name": "TEST_A", "last_name": "B", "birth_date": "2020-01-01",
            "fiscal_code": "INVALID", "city_residence": "Roma (RM)",
        }
        r = s_admin.post(f"{API}/students", json=payload)
        assert r.status_code == 400
        assert "Fiscale" in r.text

    def test_duplicate_cf_rejected(self, s_admin):
        payload = {
            "first_name": "TEST_Dup", "last_name": "Dup", "birth_date": "2020-01-01",
            "fiscal_code": CF_ALICE, "city_residence": "Roma (RM)",
        }
        r = s_admin.post(f"{API}/students", json=payload)
        assert r.status_code == 400
        assert "già" in r.text or "già".lower() in r.text.lower() or "already" in r.text.lower()

    def test_valid_cf_creates_student(self, s_admin):
        payload = {
            "first_name": "TEST_NuovoAlunno", "last_name": "Bianchi",
            "birth_date": "2021-03-10",
            "fiscal_code": CF_NEW_2, "city_residence": "Roma (RM)",
            "notes": "TEST iter7 admin",
        }
        r = s_admin.post(f"{API}/students", json=payload)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["fiscal_code"] == CF_NEW_2
        assert j["city_residence"] == "Roma (RM)"
        assert "id" in j
        # Verify persistence via GET
        gid = j["id"]
        g = s_admin.get(f"{API}/students/{gid}")
        assert g.status_code == 200
        gj = g.json()
        assert gj["fiscal_code"] == CF_NEW_2
        assert gj["city_residence"] == "Roma (RM)"
        # Cleanup
        s_admin.delete(f"{API}/students/{gid}")


# --------------- Approve enrollment: student gets CF + city; parent email logic ---------------
class TestApproveEnrollment:
    def test_approve_no_email_creates_placeholder(self, s_admin):
        # Find our pending request for CF_NEW_1
        r = s_admin.get(f"{API}/enrollment-requests", params={"status": "pending"})
        assert r.status_code == 200
        reqs = r.json()
        target = next((x for x in reqs if x.get("student_fiscal_code") == CF_NEW_1), None)
        assert target is not None, f"Pending req for {CF_NEW_1} not found. Available: {[x.get('student_fiscal_code') for x in reqs]}"

        rr = s_admin.post(f"{API}/enrollment-requests/{target['id']}/approve")
        assert rr.status_code == 200, rr.text
        j = rr.json()
        assert j.get("ok") is True
        assert j.get("student_id")
        assert j.get("parent_id")
        # No email → email_sent=False, invite_link=None
        assert j.get("email_sent") is False
        assert j.get("mock_invite_link") is None

        # Verify created student carries CF + city_residence
        sid = j["student_id"]
        gs = s_admin.get(f"{API}/students/{sid}")
        assert gs.status_code == 200
        gj = gs.json()
        assert gj["fiscal_code"] == CF_NEW_1
        assert gj["city_residence"] == "Milano (MI)"

        # Cleanup: delete student + parent + request
        pid = j["parent_id"]
        s_admin.delete(f"{API}/students/{sid}")
        s_admin.delete(f"{API}/parents/{pid}")
        s_admin.delete(f"{API}/enrollment-requests/{target['id']}")

    def test_approve_with_email_generates_invite(self, s_admin):
        # Create fresh enrollment request WITH email
        cf = "MRALSA90A01H501Z"
        payload = {
            "student_first_name": "TEST_Alessia", "student_last_name": "Rossi",
            "student_birth_date": "2020-07-01",
            "student_fiscal_code": cf,
            "parent_first_name": "Luigi", "parent_last_name": "Rossi",
            "parent_phone": "3339998877",
            "parent_email": "test_iter7_lrossi@example.com",
            "city_residence": "Napoli (NA)",
        }
        r = requests.post(f"{API}/public/enrollment-requests", json=payload, params={"tenant_slug": "demo"})
        assert r.status_code in (200, 201), r.text
        req_id = r.json()["id"]

        rr = s_admin.post(f"{API}/enrollment-requests/{req_id}/approve")
        assert rr.status_code == 200, rr.text
        j = rr.json()
        assert j.get("student_id") and j.get("parent_id")
        # With email → invite_link present (email_sent may be True or False depending on Brevo)
        assert j.get("mock_invite_link") is not None
        assert "/setup-password/" in j["mock_invite_link"]

        # Cleanup
        s_admin.delete(f"{API}/students/{j['student_id']}")
        s_admin.delete(f"{API}/parents/{j['parent_id']}")
        s_admin.delete(f"{API}/enrollment-requests/{req_id}")


# --------------- Regression ---------------
class TestRegression:
    def test_superadmin_ok(self, s_super):
        r = s_super.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "superadmin"

    def test_admin_dashboard_ok(self, s_admin):
        r = s_admin.get(f"{API}/dashboard/stats")
        assert r.status_code == 200
        assert "total_students" in r.json()

    def test_parent_children_ok(self, s_parent):
        r = s_parent.get(f"{API}/parent/me/children")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
