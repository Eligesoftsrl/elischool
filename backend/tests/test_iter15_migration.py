"""Iteration 15 - Verify legacy MySQL migration into tenant 'albero-della-vita'."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://nursery-smart.preview.emergentagent.com").rstrip("/")

ALBERO_ADMIN = ("filippo.malafronte@gmail.com", "Albero2026!")
ALBERO_TEACHER = ("a.dauria@busdauria.com", "Albero2026!")
DEMO_ADMIN = ("admin@scuolapp.it", "Admin2026!")


def _login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=15)
    return r


@pytest.fixture(scope="module")
def albero_admin_token():
    r = _login(*ALBERO_ADMIN)
    assert r.status_code == 200, f"Albero admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def albero_teacher_token():
    r = _login(*ALBERO_TEACHER)
    if r.status_code != 200:
        pytest.skip(f"Teacher login failed {r.status_code}: {r.text}")
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def demo_admin_token():
    r = _login(*DEMO_ADMIN)
    if r.status_code != 200:
        pytest.skip(f"Demo admin login failed {r.status_code}")
    return r.json()["access_token"]


def _h(token):
    return {"Authorization": f"Bearer {token}"}


# --- Dashboard stats ---
def test_dashboard_stats_albero(albero_admin_token):
    r = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=_h(albero_admin_token), timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    print("DASHBOARD:", d)
    assert d["total_students"] == 226, f"students={d['total_students']}"
    assert d["total_parents"] == 197, f"parents={d['total_parents']}"
    assert d["total_teachers"] == 13, f"teachers(+admins)={d['total_teachers']}"
    assert d["total_classes"] == 6, f"classes={d['total_classes']}"
    assert d["unassigned_students"] == 87, f"unassigned={d['unassigned_students']}"
    assert d["pending_parents"] == 197, f"pending={d['pending_parents']}"
    assert d["active_year"] is not None
    assert "2026" in str(d["active_year"].get("label", "")) or d["active_year"].get("start_year") == 2026


# --- Students ---
def test_students_count_albero(albero_admin_token):
    r = requests.get(f"{BASE_URL}/api/students", headers=_h(albero_admin_token), timeout=20)
    assert r.status_code == 200
    data = r.json()
    students = data if isinstance(data, list) else data.get("items", data.get("students", []))
    assert len(students) == 226, f"got {len(students)}"
    # search for MALAFRONTE
    found = [s for s in students if "MALAFRONTE" in (s.get("last_name", "") or "").upper()]
    assert len(found) >= 2, f"malafronte search found {len(found)}"


# --- Classrooms (sezioni) ---
def test_classrooms_albero(albero_admin_token):
    r = requests.get(f"{BASE_URL}/api/classrooms", headers=_h(albero_admin_token), timeout=15)
    assert r.status_code == 200
    classrooms = r.json()
    assert len(classrooms) == 6, f"got {len(classrooms)} classrooms"
    names = {c.get("name", "").lower() for c in classrooms}
    assert any("coccinelle" in n for n in names), f"names={names}"
    assert any("fiorellini" in n for n in names), f"names={names}"


# --- Teachers ---
def test_teachers_albero(albero_admin_token):
    r = requests.get(f"{BASE_URL}/api/teachers", headers=_h(albero_admin_token), timeout=15)
    assert r.status_code == 200
    teachers = r.json()
    assert len(teachers) == 13, f"got {len(teachers)}"
    roles = [t.get("role") for t in teachers]
    assert roles.count("admin") == 6, f"admins={roles.count('admin')}"
    assert roles.count("teacher") == 7, f"teachers={roles.count('teacher')}"


# --- Parents ---
def test_parents_albero(albero_admin_token):
    r = requests.get(f"{BASE_URL}/api/parents", headers=_h(albero_admin_token), timeout=20)
    assert r.status_code == 200
    data = r.json()
    parents = data if isinstance(data, list) else data.get("items", data.get("parents", []))
    assert len(parents) == 197, f"got {len(parents)}"
    pending = [p for p in parents if p.get("status") == "pending"]
    assert len(pending) == 197, f"pending={len(pending)}"


# --- Communications ---
def test_communications_albero(albero_admin_token):
    r = requests.get(f"{BASE_URL}/api/communications", headers=_h(albero_admin_token), timeout=15)
    assert r.status_code == 200
    comms = r.json()
    assert len(comms) == 5, f"got {len(comms)}"


# --- Lesson plans ---
def test_lesson_plans_albero(albero_admin_token):
    r = requests.get(f"{BASE_URL}/api/lesson-plans", headers=_h(albero_admin_token), timeout=15)
    assert r.status_code == 200
    plans = r.json()
    assert len(plans) == 77, f"got {len(plans)}"


# --- Calendar events ---
def test_calendar_events_albero(albero_admin_token):
    r = requests.get(f"{BASE_URL}/api/calendar-events", headers=_h(albero_admin_token), timeout=15)
    assert r.status_code == 200
    events = r.json()
    assert len(events) == 25, f"got {len(events)}"


# --- Menus ---
def test_menus_albero(albero_admin_token):
    r = requests.get(f"{BASE_URL}/api/menus", headers=_h(albero_admin_token), timeout=15)
    assert r.status_code == 200
    menus = r.json()
    assert len(menus) >= 1, f"got {len(menus)}"
    mid = menus[0]["id"]
    r2 = requests.get(f"{BASE_URL}/api/menus/{mid}/meals", headers=_h(albero_admin_token), timeout=15)
    assert r2.status_code == 200
    meals = r2.json()
    # Endpoint returns full 4x5 grid = 20 slots; 19 should be filled (non-empty primo+secondo)
    assert len(meals) == 20, f"grid={len(meals)}"
    filled = [m for m in meals if (m.get("primo") or m.get("secondo") or m.get("contorno") or m.get("frutta"))]
    assert len(filled) == 19, f"filled={len(filled)}"


# --- Extra labs ---
def test_extra_labs_albero(albero_admin_token):
    r = requests.get(f"{BASE_URL}/api/extra-labs", headers=_h(albero_admin_token), timeout=15)
    assert r.status_code == 200
    labs = r.json()
    assert len(labs) == 7, f"got {len(labs)}"


# --- Multi-tenancy isolation ---
def test_demo_admin_isolation(demo_admin_token):
    r = requests.get(f"{BASE_URL}/api/students", headers=_h(demo_admin_token), timeout=15)
    assert r.status_code == 200
    data = r.json()
    students = data if isinstance(data, list) else data.get("items", data.get("students", []))
    # Demo tenant must NOT see the 226 Albero students
    assert len(students) < 226, f"demo tenant leaking: {len(students)} students visible"


# --- Teacher role restrictions ---
def test_teacher_can_login_and_see_students(albero_teacher_token):
    r = requests.get(f"{BASE_URL}/api/students", headers=_h(albero_teacher_token), timeout=15)
    assert r.status_code == 200
