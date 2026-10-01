"""Iter8: Verify destructive DB wipe — only auth users + active school year + tenant preserved."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@scuolapp.it", "password": "Admin2026!"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# --- Login tests ---
def test_superadmin_login():
    r = requests.post(f"{API}/auth/login", json={"email": "superadmin@nido.app", "password": "SuperAdmin2026!"})
    assert r.status_code == 200
    assert r.json().get("user", {}).get("role") == "superadmin"


def test_admin_login():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@scuolapp.it", "password": "Admin2026!"})
    assert r.status_code == 200


def test_teacher_login():
    r = requests.post(f"{API}/auth/login", json={"email": "maestra.giulia@scuolapp.it", "password": "Maestra2026!"})
    assert r.status_code == 200


def test_parent_login_should_fail():
    r = requests.post(f"{API}/auth/login", json={"email": "genitore@scuolapp.it", "password": "Genitore2026!"})
    assert r.status_code in (401, 403, 404), f"Parent login should fail but got {r.status_code}: {r.text}"


# --- Empty collection tests ---
@pytest.mark.parametrize("path", [
    "/students", "/classrooms", "/parents", "/communications",
    "/lesson-plans", "/attendance", "/calendar-events",
    "/extra-labs", "/menus", "/news", "/enrollment-requests",
])
def test_collection_empty(admin_headers, path):
    r = requests.get(f"{API}{path}", headers=admin_headers)
    assert r.status_code == 200, f"{path} → {r.status_code} {r.text[:200]}"
    data = r.json()
    items = data if isinstance(data, list) else data.get("items", data.get("data", []))
    assert isinstance(items, list)
    assert len(items) == 0, f"{path} not empty: {len(items)} items"


def test_active_school_year_preserved(admin_headers):
    r = requests.get(f"{API}/school-years", headers=admin_headers)
    assert r.status_code == 200
    years = r.json()
    assert len(years) == 1, f"Expected 1 school year, got {len(years)}: {years}"
    y = years[0]
    label = y.get("label") or f"{y.get('start_year')}/{y.get('end_year')}"
    assert "2026" in str(label) and "2027" in str(label), f"Active year not 2026/2027: {y}"


# --- Create flow ---
def test_create_classroom_then_student(admin_headers):
    # Get active school year
    yrs = requests.get(f"{API}/school-years", headers=admin_headers).json()
    sy_id = yrs[0]["id"]

    # Create classroom
    r = requests.post(f"{API}/classrooms", headers=admin_headers,
                      json={"name": "TEST_Sezione_Iter8", "age_band": "3-4 anni",
                            "school_year_id": sy_id})
    assert r.status_code in (200, 201), f"Create classroom failed: {r.status_code} {r.text}"
    cls = r.json()
    classroom_id = cls.get("id") or cls.get("_id")
    assert classroom_id

    # Verify in list
    r2 = requests.get(f"{API}/classrooms", headers=admin_headers)
    assert any((c.get("id") or c.get("_id")) == classroom_id for c in r2.json())

    # Create student with valid CF
    student_payload = {
        "first_name": "TEST_Mario",
        "last_name": "Rossi",
        "fiscal_code": "RSSMRA85M01H501Z",
        "birth_date": "2022-01-15",
        "city_residence": "Roma (RM)",
        "classroom_id": classroom_id,
    }
    r3 = requests.post(f"{API}/students", headers=admin_headers, json=student_payload)
    assert r3.status_code in (200, 201), f"Create student failed: {r3.status_code} {r3.text}"
    stu = r3.json()
    assert stu.get("fiscal_code") == "RSSMRA85M01H501Z"
    student_id = stu.get("id") or stu.get("_id")

    # Cleanup
    requests.delete(f"{API}/students/{student_id}", headers=admin_headers)
    requests.delete(f"{API}/classrooms/{classroom_id}", headers=admin_headers)


def test_create_student_without_classroom(admin_headers):
    payload = {
        "first_name": "TEST_Unassigned",
        "last_name": "Bimbo",
        "fiscal_code": "BMBUNA20A01H501X",
        "birth_date": "2023-01-01",
        "city_residence": "Milano (MI)",
    }
    r = requests.post(f"{API}/students", headers=admin_headers, json=payload)
    assert r.status_code in (200, 201), f"Unassigned student create failed: {r.status_code} {r.text}"
    sid = r.json().get("id") or r.json().get("_id")
    requests.delete(f"{API}/students/{sid}", headers=admin_headers)
