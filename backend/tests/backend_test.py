"""
End-to-end backend tests for Scuola Infanzia API.
Covers: auth, brute-force lockout, dashboard, school-years, classrooms,
students, enrollments/transfer, year-transition, parents (invite flow),
activities, menus, news, parent-facing endpoints, AI report (with fallback),
role-based protection.
"""

import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://nursery-smart.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@scuolapp.it"
ADMIN_PASSWORD = "Admin2026!"
TEACHER_EMAIL = "maestra.giulia@scuolapp.it"
TEACHER_PASSWORD = "Maestra2026!"
PARENT_EMAIL = "genitore@scuolapp.it"
PARENT_PASSWORD = "Genitore2026!"


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    return r


@pytest.fixture(scope="session")
def admin_token():
    r = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def teacher_token():
    r = _login(TEACHER_EMAIL, TEACHER_PASSWORD)
    if r.status_code != 200:
        pytest.skip("teacher login unavailable")
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def parent_token():
    r = _login(PARENT_EMAIL, PARENT_PASSWORD)
    if r.status_code != 200:
        pytest.skip("parent login unavailable")
    return r.json()["access_token"]


def _h(token):
    return {"Authorization": f"Bearer {token}"}


# ---------------- Auth ----------------
class TestAuth:
    def test_login_admin(self):
        r = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data and data["access_token"]
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert "password_hash" not in data["user"]

    def test_login_parent(self):
        r = _login(PARENT_EMAIL, PARENT_PASSWORD)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "parent"

    def test_login_wrong_password(self):
        # use a fresh email to avoid affecting lockout of seeded user
        r = requests.post(f"{API}/auth/login", json={"email": "no-such-user-xyz@scuolapp.it", "password": "wrong"})
        assert r.status_code == 401

    def test_me_with_bearer(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=_h(admin_token))
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_forgot_password_returns_mock_link(self):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": ADMIN_EMAIL})
        assert r.status_code == 200
        body = r.json()
        assert "mock_reset_link" in body and body.get("mock_token")

    def test_reset_password_flow(self):
        # request reset
        r = requests.post(f"{API}/auth/forgot-password", json={"email": ADMIN_EMAIL})
        token = r.json()["mock_token"]
        new_pwd = "TempPwd2026!"
        rr = requests.post(f"{API}/auth/reset-password", json={"token": token, "password": new_pwd})
        assert rr.status_code == 200
        # login with new password
        r2 = _login(ADMIN_EMAIL, new_pwd)
        assert r2.status_code == 200
        # restore the original password
        r3 = requests.post(f"{API}/auth/forgot-password", json={"email": ADMIN_EMAIL})
        token2 = r3.json()["mock_token"]
        rr2 = requests.post(f"{API}/auth/reset-password", json={"token": token2, "password": ADMIN_PASSWORD})
        assert rr2.status_code == 200
        assert _login(ADMIN_EMAIL, ADMIN_PASSWORD).status_code == 200

    def test_brute_force_lockout(self):
        # use a unique email so we don't lock out real accounts
        bad_email = f"bf-{uuid.uuid4().hex[:8]}@scuolapp.it"
        statuses = []
        for _ in range(5):
            r = requests.post(f"{API}/auth/login", json={"email": bad_email, "password": "wrong"})
            statuses.append(r.status_code)
        # 6th attempt should be locked (429)
        r = requests.post(f"{API}/auth/login", json={"email": bad_email, "password": "wrong"})
        assert r.status_code == 429, f"expected 429 after 5 fails, got {r.status_code} (prev: {statuses})"


# ---------------- School Years / Classrooms / Students ----------------
class TestCoreEntities:
    def test_dashboard_stats(self, admin_token):
        r = requests.get(f"{API}/dashboard/stats", headers=_h(admin_token))
        assert r.status_code == 200
        d = r.json()
        for k in ["total_students", "total_parents", "total_teachers", "total_classes", "today_activities"]:
            assert k in d
        assert d["total_students"] >= 6

    def test_school_years_list_create_activate(self, admin_token):
        r = requests.get(f"{API}/school-years", headers=_h(admin_token))
        assert r.status_code == 200
        years = r.json()
        assert len(years) >= 2
        original_active = next((y for y in years if y["is_active"]), None)
        assert original_active

        # create
        label = f"TEST_{uuid.uuid4().hex[:6]}"
        rc = requests.post(f"{API}/school-years", headers=_h(admin_token),
                           json={"label": label, "start_date": "2030-09-01", "end_date": "2031-06-30", "is_active": False})
        assert rc.status_code == 200
        new_id = rc.json()["id"]

        # activate
        ra = requests.post(f"{API}/school-years/{new_id}/activate", headers=_h(admin_token))
        assert ra.status_code == 200
        assert ra.json()["is_active"] is True

        # restore original active
        requests.post(f"{API}/school-years/{original_active['id']}/activate", headers=_h(admin_token))

        # delete - only admin
        rd = requests.delete(f"{API}/school-years/{new_id}", headers=_h(admin_token))
        assert rd.status_code == 200

    def test_classrooms_list_with_counts(self, admin_token):
        years = requests.get(f"{API}/school-years", headers=_h(admin_token)).json()
        active = next(y for y in years if y["is_active"])
        r = requests.get(f"{API}/classrooms?school_year_id={active['id']}", headers=_h(admin_token))
        assert r.status_code == 200
        rooms = r.json()
        assert len(rooms) >= 3
        assert all("student_count" in c for c in rooms)
        # at least one with students
        assert any(c["student_count"] > 0 for c in rooms)

    def test_classroom_create_and_students(self, admin_token):
        years = requests.get(f"{API}/school-years", headers=_h(admin_token)).json()
        active = next(y for y in years if y["is_active"])
        # create
        rc = requests.post(f"{API}/classrooms", headers=_h(admin_token), json={
            "name": f"TEST_room_{uuid.uuid4().hex[:4]}", "age_band": "3-4 anni",
            "notes": "", "school_year_id": active["id"], "teacher_ids": []
        })
        assert rc.status_code == 200
        cid = rc.json()["id"]
        # get students (empty)
        rs = requests.get(f"{API}/classrooms/{cid}/students", headers=_h(admin_token))
        assert rs.status_code == 200
        assert isinstance(rs.json(), list)
        requests.delete(f"{API}/classrooms/{cid}", headers=_h(admin_token))

    def test_students_crud(self, admin_token):
        # list
        r = requests.get(f"{API}/students", headers=_h(admin_token))
        assert r.status_code == 200 and len(r.json()) >= 6
        # create
        c = requests.post(f"{API}/students", headers=_h(admin_token),
                          json={"first_name": "TESTA", "last_name": "Studente", "birth_date": "2021-01-01"})
        assert c.status_code == 200
        sid = c.json()["id"]
        # patch
        p = requests.patch(f"{API}/students/{sid}", headers=_h(admin_token),
                           json={"first_name": "TESTB", "last_name": "Studente", "birth_date": "2021-01-01"})
        assert p.status_code == 200
        assert p.json()["first_name"] == "TESTB"
        # delete
        d = requests.delete(f"{API}/students/{sid}", headers=_h(admin_token))
        assert d.status_code == 200


# ---------------- Enrollments / Transfer / Year transition ----------------
class TestEnrollmentsTransfers:
    def test_transfer_student(self, admin_token):
        years = requests.get(f"{API}/school-years", headers=_h(admin_token)).json()
        active = next(y for y in years if y["is_active"])
        rooms = requests.get(f"{API}/classrooms?school_year_id={active['id']}", headers=_h(admin_token)).json()
        coccinelle = next(r for r in rooms if r["name"] == "Coccinelle")
        farfalle = next(r for r in rooms if r["name"] == "Farfalle")
        students_in_c = requests.get(f"{API}/classrooms/{coccinelle['id']}/students", headers=_h(admin_token)).json()
        assert students_in_c, "no students in Coccinelle to transfer"
        sid = students_in_c[0]["id"]

        # transfer
        tr = requests.post(f"{API}/enrollments/transfer", headers=_h(admin_token), json={
            "student_id": sid, "to_classroom_id": farfalle["id"], "school_year_id": active["id"]
        })
        assert tr.status_code == 200

        # verify
        in_farfalle = requests.get(f"{API}/classrooms/{farfalle['id']}/students", headers=_h(admin_token)).json()
        assert any(s["id"] == sid for s in in_farfalle)

        # transfer back
        requests.post(f"{API}/enrollments/transfer", headers=_h(admin_token), json={
            "student_id": sid, "to_classroom_id": coccinelle["id"], "school_year_id": active["id"]
        })

    def test_year_transition(self, admin_token):
        years = requests.get(f"{API}/school-years", headers=_h(admin_token)).json()
        active = next(y for y in years if y["is_active"])
        # create a target year
        rc = requests.post(f"{API}/school-years", headers=_h(admin_token), json={
            "label": f"TEST_YT_{uuid.uuid4().hex[:4]}", "start_date": "2099-09-01",
            "end_date": "2100-06-30", "is_active": False
        })
        target_year = rc.json()
        # need classrooms in target year — create one matching by name "Coccinelle"
        rooms = requests.get(f"{API}/classrooms?school_year_id={active['id']}", headers=_h(admin_token)).json()
        coccinelle = next(r for r in rooms if r["name"] == "Coccinelle")
        nc = requests.post(f"{API}/classrooms", headers=_h(admin_token), json={
            "name": "Coccinelle (next)", "age_band": "3 anni", "notes": "",
            "school_year_id": target_year["id"], "teacher_ids": []
        }).json()

        rt = requests.post(f"{API}/year-transition", headers=_h(admin_token), json={
            "from_year_id": active["id"], "to_year_id": target_year["id"],
            "mapping": [{"from_classroom_id": coccinelle["id"], "to_classroom_id": nc["id"]}]
        })
        assert rt.status_code == 200
        assert rt.json()["moved"] >= 1
        # verify enrollments exist for target year in new classroom
        in_new = requests.get(f"{API}/classrooms/{nc['id']}/students?school_year_id={target_year['id']}",
                              headers=_h(admin_token)).json()
        assert len(in_new) >= 1

        # cleanup
        requests.delete(f"{API}/classrooms/{nc['id']}", headers=_h(admin_token))
        requests.delete(f"{API}/school-years/{target_year['id']}", headers=_h(admin_token))


# ---------------- Parents invite flow ----------------
class TestParents:
    def test_parent_invite_and_setup(self, admin_token):
        # pick an existing student
        students = requests.get(f"{API}/students", headers=_h(admin_token)).json()
        sid = students[0]["id"]
        email = f"test-parent-{uuid.uuid4().hex[:6]}@scuolapp.it"

        rc = requests.post(f"{API}/parents", headers=_h(admin_token), json={
            "first_name": "Test", "last_name": "Genitore", "email": email,
            "phone": "", "notes": "", "student_ids": [sid]
        })
        assert rc.status_code == 200
        body = rc.json()
        assert body["parent"]["status"] == "pending"
        assert "mock_invite_link" in body and body["mock_invite_token"]
        token = body["mock_invite_token"]
        pid = body["parent"]["id"]

        # pending login should fail with 403
        rl = requests.post(f"{API}/auth/login", json={"email": email, "password": "Whatever123!"})
        # actually password not set => 401 (wrong creds) is also OK since hash is None
        assert rl.status_code in (401, 403)

        # resend invite
        rr = requests.post(f"{API}/parents/{pid}/resend-invite", headers=_h(admin_token))
        assert rr.status_code == 200 and "mock_invite_link" in rr.json()

        # setup password using original token (still valid)
        new_pwd = "Parent2026!"
        rs = requests.post(f"{API}/auth/setup-password", json={"token": token, "password": new_pwd})
        assert rs.status_code == 200

        # now login should work
        rlog = _login(email, new_pwd)
        assert rlog.status_code == 200
        assert rlog.json()["user"]["role"] == "parent"
        ptoken = rlog.json()["access_token"]

        # parent can access their child
        rc2 = requests.get(f"{API}/parent/me/children", headers=_h(ptoken))
        assert rc2.status_code == 200
        kids = rc2.json()
        assert any(k["id"] == sid for k in kids)

        # cleanup
        requests.delete(f"{API}/parents/{pid}", headers=_h(admin_token))


# ---------------- Activities / Menus / News ----------------
class TestActivitiesMenusNews:
    def test_activities_upsert_idempotent(self, admin_token):
        students = requests.get(f"{API}/students", headers=_h(admin_token)).json()
        sid = students[1]["id"]
        d = "2025-01-15"
        payload = {"student_id": sid, "date": d, "didattica": True, "umore": "sereno"}
        r1 = requests.post(f"{API}/activities", headers=_h(admin_token), json=payload)
        assert r1.status_code == 200
        aid1 = r1.json()["id"]
        # upsert again
        payload2 = dict(payload)
        payload2["umore"] = "vivace"
        r2 = requests.post(f"{API}/activities", headers=_h(admin_token), json=payload2)
        assert r2.status_code == 200
        assert r2.json()["id"] == aid1
        assert r2.json()["umore"] == "vivace"
        requests.delete(f"{API}/activities/{aid1}", headers=_h(admin_token))

    def test_activities_filter(self, admin_token):
        years = requests.get(f"{API}/school-years", headers=_h(admin_token)).json()
        active = next(y for y in years if y["is_active"])
        rooms = requests.get(f"{API}/classrooms?school_year_id={active['id']}", headers=_h(admin_token)).json()
        cid = rooms[0]["id"]
        r = requests.get(f"{API}/activities?classroom_id={cid}&school_year_id={active['id']}&date_from=2020-01-01",
                         headers=_h(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_menus(self, admin_token):
        r = requests.get(f"{API}/menus", headers=_h(admin_token))
        assert r.status_code == 200 and len(r.json()) >= 1
        cur = requests.get(f"{API}/menus/current", headers=_h(admin_token))
        assert cur.status_code == 200
        assert cur.json() is not None  # seeded for current week
        # create
        rc = requests.post(f"{API}/menus", headers=_h(admin_token), json={
            "week_label": "TEST_week", "valid_from": "2099-01-01", "valid_to": "2099-01-07", "days": []
        })
        assert rc.status_code == 200
        requests.delete(f"{API}/menus/{rc.json()['id']}", headers=_h(admin_token))

    def test_news_list_and_create(self, admin_token, parent_token):
        # parent can list
        rp = requests.get(f"{API}/news", headers=_h(parent_token))
        assert rp.status_code == 200 and len(rp.json()) >= 1
        # admin can create
        rc = requests.post(f"{API}/news", headers=_h(admin_token), json={
            "title": "TEST news", "body": "body", "category": "generale"
        })
        assert rc.status_code == 200
        requests.delete(f"{API}/news/{rc.json()['id']}", headers=_h(admin_token))


# ---------------- Parent endpoints + AI report ----------------
class TestParentFacing:
    def test_my_children(self, parent_token):
        r = requests.get(f"{API}/parent/me/children", headers=_h(parent_token))
        assert r.status_code == 200
        kids = r.json()
        assert len(kids) >= 1
        # classroom should be enriched
        assert kids[0].get("classroom") is not None

    def test_child_day(self, parent_token):
        kids = requests.get(f"{API}/parent/me/children", headers=_h(parent_token)).json()
        sid = kids[0]["id"]
        r = requests.get(f"{API}/parent/child/{sid}/day", headers=_h(parent_token))
        assert r.status_code == 200
        # Alice has today's activity seeded
        assert r.json()["activity"] is not None

    def test_child_timeline(self, parent_token):
        kids = requests.get(f"{API}/parent/me/children", headers=_h(parent_token)).json()
        sid = kids[0]["id"]
        r = requests.get(f"{API}/parent/child/{sid}/timeline", headers=_h(parent_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_child_day_403_unlinked(self, parent_token, admin_token):
        # find a student NOT linked to parent
        kids = requests.get(f"{API}/parent/me/children", headers=_h(parent_token)).json()
        kid_ids = {k["id"] for k in kids}
        students = requests.get(f"{API}/students", headers=_h(admin_token)).json()
        other = next(s for s in students if s["id"] not in kid_ids)
        r = requests.get(f"{API}/parent/child/{other['id']}/day", headers=_h(parent_token))
        assert r.status_code == 403

    def test_ai_daily_report(self, parent_token):
        kids = requests.get(f"{API}/parent/me/children", headers=_h(parent_token)).json()
        sid = kids[0]["id"]
        r = requests.get(f"{API}/ai/daily-report/{sid}", headers=_h(parent_token), timeout=60)
        assert r.status_code == 200, f"AI report failed: {r.status_code} {r.text}"
        body = r.json()
        # Must always return a non-empty Italian report (or fallback)
        assert body.get("report") is not None and len(body["report"]) > 20

    def test_dashboard_blocked_for_parent(self, parent_token):
        r = requests.get(f"{API}/dashboard/stats", headers=_h(parent_token))
        assert r.status_code == 403


# ---------------- Role-based protection ----------------
class TestRoleProtection:
    def test_delete_school_year_admin_only(self, admin_token, parent_token):
        # create as admin
        rc = requests.post(f"{API}/school-years", headers=_h(admin_token), json={
            "label": f"TEST_RP_{uuid.uuid4().hex[:4]}", "start_date": "2098-09-01",
            "end_date": "2099-06-30", "is_active": False
        })
        yid = rc.json()["id"]
        # parent cannot delete
        rp = requests.delete(f"{API}/school-years/{yid}", headers=_h(parent_token))
        assert rp.status_code == 403
        # admin can
        ra = requests.delete(f"{API}/school-years/{yid}", headers=_h(admin_token))
        assert ra.status_code == 200
