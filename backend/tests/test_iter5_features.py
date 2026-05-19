"""Iteration 5 backend tests: Compleanni, Stampa Tesserini PDF, Iscrizione pubblica."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@scuolapp.it", "password": "Admin2026!"}
TEACHER = {"email": "maestra.giulia@scuolapp.it", "password": "Maestra2026!"}
PARENT = {"email": "genitore@scuolapp.it", "password": "Genitore2026!"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN)


@pytest.fixture(scope="module")
def teacher_token():
    return _login(TEACHER)


@pytest.fixture(scope="module")
def parent_token():
    return _login(PARENT)


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


# ============ PUBLIC ENROLLMENT ============
class TestPublicEnrollment:
    def test_public_enrollment_submit_no_auth(self):
        payload = {
            "student_first_name": "TEST_Mario",
            "student_last_name": "TEST_Rossi",
            "student_birth_date": "2021-06-15",
            "parent_first_name": "Anna",
            "parent_last_name": "Rossi",
            "parent_email": f"test_enroll_{int(time.time())}@example.com",
            "parent_phone": "+39 333 1234567",
            "address": "Via Roma 1, Milano",
            "notes": "Allergia alle arachidi",
        }
        r = requests.post(f"{API}/public/enrollment-requests", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert "id" in data and isinstance(data["id"], str)
        # store for next tests
        pytest.enrollment_id_pending = data["id"]
        pytest.enrollment_email = payload["parent_email"]

    def test_public_enrollment_invalid_email(self):
        payload = {
            "student_first_name": "X", "student_last_name": "Y",
            "student_birth_date": "2021-01-01",
            "parent_first_name": "A", "parent_last_name": "B",
            "parent_email": "not-an-email",
        }
        r = requests.post(f"{API}/public/enrollment-requests", json=payload, timeout=15)
        assert r.status_code == 422

    def test_list_enrollment_requests_requires_auth(self):
        r = requests.get(f"{API}/enrollment-requests", timeout=15)
        assert r.status_code in (401, 403)

    def test_list_enrollment_requests_admin(self, admin_token):
        r = requests.get(f"{API}/enrollment-requests", params={"status": "pending"},
                         headers=_auth(admin_token), timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        ids = [x["id"] for x in items]
        assert pytest.enrollment_id_pending in ids
        # confirm structure
        match = next(x for x in items if x["id"] == pytest.enrollment_id_pending)
        assert match["status"] == "pending"
        assert match["student_first_name"] == "TEST_Mario"
        # no mongo _id leakage
        assert "_id" not in match

    def test_approve_creates_student_and_parent_invite(self, admin_token):
        rid = pytest.enrollment_id_pending
        r = requests.post(f"{API}/enrollment-requests/{rid}/approve",
                          headers=_auth(admin_token), timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert "student_id" in data and "parent_id" in data
        assert "mock_invite_link" in data
        assert "/setup-password/" in data["mock_invite_link"]
        pytest.created_student_id = data["student_id"]
        pytest.created_parent_id = data["parent_id"]

        # GET to verify request is now approved
        lst = requests.get(f"{API}/enrollment-requests", params={"status": "approved"},
                           headers=_auth(admin_token), timeout=15).json()
        assert any(x["id"] == rid and x["status"] == "approved" for x in lst)

    def test_approve_already_approved_returns_400(self, admin_token):
        rid = pytest.enrollment_id_pending
        r = requests.post(f"{API}/enrollment-requests/{rid}/approve",
                          headers=_auth(admin_token), timeout=15)
        assert r.status_code == 400

    def test_reject_flow(self, admin_token):
        # create another request
        payload = {
            "student_first_name": "TEST_Luca",
            "student_last_name": "TEST_Bianchi",
            "student_birth_date": "2020-03-10",
            "parent_first_name": "Marco",
            "parent_last_name": "Bianchi",
            "parent_email": f"test_reject_{int(time.time())}@example.com",
        }
        c = requests.post(f"{API}/public/enrollment-requests", json=payload, timeout=15)
        assert c.status_code == 200
        rid = c.json()["id"]
        r = requests.post(f"{API}/enrollment-requests/{rid}/reject",
                          headers=_auth(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["ok"] is True
        lst = requests.get(f"{API}/enrollment-requests", params={"status": "rejected"},
                           headers=_auth(admin_token), timeout=15).json()
        match = next((x for x in lst if x["id"] == rid), None)
        assert match and match["status"] == "rejected"
        # cleanup
        requests.delete(f"{API}/enrollment-requests/{rid}",
                        headers=_auth(admin_token), timeout=15)

    def test_reject_nonexistent_404(self, admin_token):
        r = requests.post(f"{API}/enrollment-requests/does-not-exist/reject",
                          headers=_auth(admin_token), timeout=15)
        assert r.status_code == 404

    def test_parent_cannot_list(self, parent_token):
        r = requests.get(f"{API}/enrollment-requests", headers=_auth(parent_token), timeout=15)
        assert r.status_code == 403

    @classmethod
    def teardown_class(cls):
        # Best effort cleanup of created student & request
        try:
            token = _login(ADMIN)
            requests.delete(f"{API}/enrollment-requests/{pytest.enrollment_id_pending}",
                            headers=_auth(token), timeout=10)
            sid = getattr(pytest, "created_student_id", None)
            if sid:
                requests.delete(f"{API}/students/{sid}", headers=_auth(token), timeout=10)
        except Exception:
            pass


# ============ BIRTHDAYS ============
class TestBirthdays:
    def test_birthdays_requires_auth(self):
        r = requests.get(f"{API}/birthdays", timeout=15)
        assert r.status_code in (401, 403)

    def test_birthdays_default(self, admin_token):
        r = requests.get(f"{API}/birthdays", headers=_auth(admin_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for item in data:
            assert "next_birthday" in item
            assert "days_until" in item
            assert "age_turning" in item
            assert isinstance(item["days_until"], int)
            assert 0 <= item["days_until"] <= 7
            assert "_id" not in item

    @pytest.mark.parametrize("days", [7, 30, 90, 365])
    def test_birthdays_range(self, admin_token, days):
        r = requests.get(f"{API}/birthdays", params={"days": days},
                         headers=_auth(admin_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        for item in data:
            assert 0 <= item["days_until"] <= days

    def test_birthdays_sorted(self, admin_token):
        r = requests.get(f"{API}/birthdays", params={"days": 365},
                         headers=_auth(admin_token), timeout=15)
        data = r.json()
        if len(data) > 1:
            assert data == sorted(data, key=lambda x: x["days_until"])

    def test_birthdays_teacher_allowed(self, teacher_token):
        r = requests.get(f"{API}/birthdays", headers=_auth(teacher_token), timeout=15)
        assert r.status_code == 200

    def test_birthdays_parent_forbidden(self, parent_token):
        r = requests.get(f"{API}/birthdays", headers=_auth(parent_token), timeout=15)
        assert r.status_code == 403


# ============ BARCODE PDF ============
class TestBarcodePdf:
    def test_pdf_requires_auth(self):
        r = requests.get(f"{API}/barcodes/pdf", timeout=20)
        assert r.status_code in (401, 403)

    def test_pdf_all_students_admin(self, admin_token):
        r = requests.get(f"{API}/barcodes/pdf", headers=_auth(admin_token), timeout=30)
        assert r.status_code == 200, r.text[:300]
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert len(r.content) > 1000
        assert r.content[:4] == b"%PDF"

    def test_pdf_classroom_filter(self, admin_token):
        # get active year + first classroom
        ys = requests.get(f"{API}/school-years", headers=_auth(admin_token), timeout=15).json()
        active = next((y for y in ys if y.get("is_active")), ys[0])
        cs = requests.get(f"{API}/classrooms", params={"school_year_id": active["id"]},
                         headers=_auth(admin_token), timeout=15).json()
        assert len(cs) > 0
        cid = cs[0]["id"]
        r = requests.get(f"{API}/barcodes/pdf",
                        params={"classroom_id": cid, "school_year_id": active["id"]},
                        headers=_auth(admin_token), timeout=30)
        assert r.status_code in (200, 404)
        if r.status_code == 200:
            assert r.headers.get("content-type", "").startswith("application/pdf")
            assert r.content[:4] == b"%PDF"

    def test_pdf_parent_forbidden(self, parent_token):
        r = requests.get(f"{API}/barcodes/pdf", headers=_auth(parent_token), timeout=15)
        assert r.status_code == 403
