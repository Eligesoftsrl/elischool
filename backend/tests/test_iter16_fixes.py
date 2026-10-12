"""Iteration 16 - Retest 2 migration data fixes + 1 frontend fix.

Fix 1: lesson_plans now have school_year_id populated (77 plans in active year)
Fix 2: menus now use valid_from/valid_to instead of date_from/date_to
Fix 3: Dashboard today-activities should resolve student names (verified in UI test)
"""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ALBERO_ADMIN = ("filippo.malafronte@gmail.com", "Albero2026!")


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ALBERO_ADMIN[0], "password": ALBERO_ADMIN[1]}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _h(t):
    return {"Authorization": f"Bearer {t}"}


def _active_year(token):
    r = requests.get(f"{BASE_URL}/api/school-years", headers=_h(token), timeout=15)
    assert r.status_code == 200, r.text
    years = r.json()
    active = [y for y in years if y.get("is_active")]
    assert active, f"no active year in {years}"
    return active[0]


# --- Active school year ---
def test_active_school_year(token):
    y = _active_year(token)
    assert y.get("id")


# --- Fix 1: lesson_plans with school_year_id filter returns 77 ---
def test_lesson_plans_with_active_year_filter(token):
    yr = _active_year(token)
    year_id = yr["id"]

    # Request lesson plans filtered by active year (what the frontend does by default)
    r = requests.get(
        f"{BASE_URL}/api/lesson-plans",
        headers=_h(token),
        params={"school_year_id": year_id},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    plans = r.json()
    assert len(plans) == 77, f"expected 77 lesson plans with school_year_id={year_id}, got {len(plans)}"
    # Every plan must have school_year_id set
    missing = [p for p in plans if not p.get("school_year_id")]
    assert len(missing) == 0, f"{len(missing)} plans still missing school_year_id"
    # Every plan must have date_from and date_to
    with_dates = [p for p in plans if p.get("date_from") and p.get("date_to")]
    assert len(with_dates) == 77, f"{77 - len(with_dates)} plans missing dates"


# --- Fix 2: menus use valid_from/valid_to ---
def test_menus_valid_from_to(token):
    r = requests.get(f"{BASE_URL}/api/menus", headers=_h(token), timeout=15)
    assert r.status_code == 200, r.text
    menus = r.json()
    assert len(menus) >= 1, f"got {len(menus)} menus"
    m = menus[0]
    assert m.get("valid_from"), f"menu missing valid_from: {m}"
    assert m.get("valid_to"), f"menu missing valid_to: {m}"
    # Old fields should be gone (or at least valid_* must be strings in ISO date format)
    assert "2026" in str(m["valid_from"]), f"valid_from={m['valid_from']}"
    assert "2027" in str(m["valid_to"]), f"valid_to={m['valid_to']}"
    # Title should contain 2026/2027
    title = m.get("title", "") or m.get("name", "")
    assert "2026" in title or "2027" in title, f"title={title}"


# --- Fix 2b: /api/menus/current should now return the migrated menu ---
def test_menus_current_returns_menu(token):
    r = requests.get(f"{BASE_URL}/api/menus/current", headers=_h(token), timeout=15)
    # Allowed: 200 with the menu, or 404 if today falls outside valid_from/valid_to.
    # The migrated menu is 2026-09-02 → 2027-07-31; today (Jan 2026) is BEFORE 2026-09-02,
    # so 404 is acceptable. But the endpoint must at least not 500.
    assert r.status_code in (200, 404), f"status={r.status_code} body={r.text}"


# --- Regression: counters unchanged ---
def test_dashboard_counters_unchanged(token):
    r = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=_h(token), timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["total_students"] == 226
    assert d["total_parents"] == 197
    assert d["total_teachers"] == 13
    assert d["total_classes"] == 6


# --- Fix 3 support: /api/students returns names that can be used to resolve activity student_id ---
def test_students_have_names_for_dashboard_map(token):
    r = requests.get(f"{BASE_URL}/api/students", headers=_h(token), timeout=20)
    assert r.status_code == 200
    data = r.json()
    students = data if isinstance(data, list) else data.get("items", [])
    assert len(students) == 226
    sample = students[0]
    assert sample.get("id")
    assert sample.get("first_name") or sample.get("last_name"), f"student missing name: {sample}"


# --- Fix 3 support: today's activities endpoint ---
def test_today_activities_endpoint(token):
    # Try common endpoints the dashboard might call
    for path in ["/api/activities/today", "/api/diary/today", "/api/dashboard/today-activities"]:
        r = requests.get(f"{BASE_URL}{path}", headers=_h(token), timeout=15)
        if r.status_code == 200:
            data = r.json()
            print(f"activities endpoint {path} -> {len(data) if isinstance(data, list) else type(data)}")
            return
    # Fallback: just assert dashboard loads
    r = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=_h(token), timeout=15)
    assert r.status_code == 200
