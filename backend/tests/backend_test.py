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


# ---------------- Activities (new string-shape) / News ----------------
class TestActivitiesNews:
    def test_activities_upsert_string_shape_idempotent(self, admin_token):
        students = requests.get(f"{API}/students", headers=_h(admin_token)).json()
        sid = students[1]["id"]
        d = "2025-01-15"
        payload = {
            "student_id": sid, "date": d,
            "didattica": "Partecipato", "note_didattica": "ok",
            "motoria": "Non ha Partecipato", "note_motoria": "",
            "pranzo": "Ha mangiato poco", "note_pranzo": "poca pasta",
            "merenda": "Si", "riposo": "No",
            "cacca": "Si", "pipi": "No",
            "note": "TEST_note",
        }
        r1 = requests.post(f"{API}/activities", headers=_h(admin_token), json=payload)
        assert r1.status_code == 200, r1.text
        body1 = r1.json()
        aid1 = body1["id"]
        # Verify NEW string fields
        assert body1["didattica"] == "Partecipato"
        assert body1["motoria"] == "Non ha Partecipato"
        assert body1["pranzo"] == "Ha mangiato poco"
        assert body1["merenda"] == "Si"
        assert body1["riposo"] == "No"
        # OLD fields must NOT exist on the model output
        for old_field in ("umore", "riposo_minuti", "bagno_cambi"):
            assert old_field not in body1, f"old field {old_field} still present"

        # OLD integer fields must NOT be required: posting without them works (already done above)
        # Sending old fields should also be ignored (extra fields → 200, fields silently dropped by pydantic default)
        # Idempotent upsert: same (student_id, date)
        payload2 = dict(payload)
        payload2["pranzo"] = "Ha mangiato"
        payload2["note"] = "TEST_updated"
        r2 = requests.post(f"{API}/activities", headers=_h(admin_token), json=payload2)
        assert r2.status_code == 200
        assert r2.json()["id"] == aid1
        assert r2.json()["pranzo"] == "Ha mangiato"
        assert r2.json()["note"] == "TEST_updated"

        # GET verifies persistence
        rl = requests.get(f"{API}/activities?student_id={sid}&date_from={d}&date_to={d}", headers=_h(admin_token))
        assert rl.status_code == 200
        rows = rl.json()
        assert len(rows) == 1 and rows[0]["id"] == aid1
        assert rows[0]["pranzo"] == "Ha mangiato"

        requests.delete(f"{API}/activities/{aid1}", headers=_h(admin_token))

    def test_activities_old_integer_fields_not_required(self, admin_token):
        """Posting with only minimal new-shape fields (no umore/riposo_minuti/bagno_cambi) must succeed."""
        students = requests.get(f"{API}/students", headers=_h(admin_token)).json()
        sid = students[2]["id"]
        d = "2025-01-16"
        r = requests.post(f"{API}/activities", headers=_h(admin_token), json={
            "student_id": sid, "date": d, "didattica": "Partecipato"
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["didattica"] == "Partecipato"
        # empty defaults for other strings
        assert body["pranzo"] == ""
        assert body["riposo"] == ""
        requests.delete(f"{API}/activities/{body['id']}", headers=_h(admin_token))

    def test_activities_seeded_alice_new_shape(self, admin_token, parent_token):
        """The seeded Alice activity must use the new string values."""
        kids = requests.get(f"{API}/parent/me/children", headers=_h(parent_token)).json()
        alice_id = kids[0]["id"]
        r = requests.get(f"{API}/parent/child/{alice_id}/day", headers=_h(parent_token))
        assert r.status_code == 200
        act = r.json()["activity"]
        assert act is not None
        assert act["didattica"] == "Partecipato"
        assert act["motoria"] == "Partecipato"
        assert act["pranzo"] == "Ha mangiato"
        assert act["riposo"] == "Si"
        assert act["merenda"] == "Si"
        assert act["cacca"] == "Si"
        assert act["pipi"] == "Si"

    def test_activities_filter(self, admin_token):
        years = requests.get(f"{API}/school-years", headers=_h(admin_token)).json()
        active = next(y for y in years if y["is_active"])
        rooms = requests.get(f"{API}/classrooms?school_year_id={active['id']}", headers=_h(admin_token)).json()
        cid = rooms[0]["id"]
        r = requests.get(f"{API}/activities?classroom_id={cid}&school_year_id={active['id']}&date_from=2020-01-01",
                         headers=_h(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_ai_report_uses_new_shape(self, parent_token):
        """The AI report fallback should mention the new string values."""
        kids = requests.get(f"{API}/parent/me/children", headers=_h(parent_token)).json()
        sid = kids[0]["id"]
        r = requests.get(f"{API}/ai/daily-report/{sid}", headers=_h(parent_token), timeout=60)
        assert r.status_code == 200
        body = r.json()
        assert body.get("report") and len(body["report"]) > 20
        # Either AI or fallback should reflect the new shapes (Partecipato / Ha mangiato)
        # AI may paraphrase to lowercase ("ha partecipato", "ha mangiato"), so compare case-insensitive
        rep_lower = body["report"].lower()
        assert ("partecipato" in rep_lower) or ("ha mangiato" in rep_lower) or ("mangiat" in rep_lower)

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


# ---------------- Rotating Menu (4 weeks × 5 days) ----------------
DAYS_IT = ["Lunedi", "Martedi", "Mercoledi", "Giovedi", "Venerdi"]


class TestMenuRotating:
    def test_list_menus_with_meal_count(self, admin_token):
        r = requests.get(f"{API}/menus", headers=_h(admin_token))
        assert r.status_code == 200
        menus = r.json()
        assert len(menus) >= 1
        seeded = next((m for m in menus if m.get("name") == "Menu 2025/2026"), None)
        assert seeded is not None, "Seeded menu 'Menu 2025/2026' missing"
        assert seeded.get("meal_count") == 20, f"seeded meal_count {seeded.get('meal_count')} != 20"
        assert seeded["valid_from"] == "2025-09-15"
        assert seeded["valid_to"] == "2026-06-30"
        assert "NOTA BENE" in (seeded.get("notes") or "")

    def test_seeded_menu_meals_match_mysql(self, admin_token):
        menus = requests.get(f"{API}/menus", headers=_h(admin_token)).json()
        seeded = next(m for m in menus if m.get("name") == "Menu 2025/2026")
        r = requests.get(f"{API}/menus/{seeded['id']}/meals", headers=_h(admin_token))
        assert r.status_code == 200
        meals = r.json()
        assert len(meals) == 20
        # Ordering: week 1..4, day Lunedi..Venerdi
        expected_order = [(w, d) for w in [1, 2, 3, 4] for d in DAYS_IT]
        assert [(m["week"], m["day"]) for m in meals] == expected_order
        # Sett 1 Lunedi must match user's MySQL data
        s1_lun = meals[0]
        assert s1_lun["primo"] == "Pasta con legumi (lenticchie)"
        assert s1_lun["secondo"] == "Prosciutto cotto"
        assert s1_lun["contorno"] == "Insalata"
        assert s1_lun["frutta"] == "Frutta fresca"

    def test_create_menu_autocreates_20_empty_meals(self, admin_token):
        rc = requests.post(f"{API}/menus", headers=_h(admin_token), json={
            "name": "TEST_menu_rot", "valid_from": "2099-01-01", "valid_to": "2099-12-31",
            "notes": "TEST"
        })
        assert rc.status_code == 200, rc.text
        mid = rc.json()["id"]
        try:
            r = requests.get(f"{API}/menus/{mid}/meals", headers=_h(admin_token))
            assert r.status_code == 200
            meals = r.json()
            assert len(meals) == 20
            # All empty
            for m in meals:
                assert m["primo"] == "" and m["secondo"] == "" and m["contorno"] == "" and m["frutta"] == ""
            # meal_count via list
            menus = requests.get(f"{API}/menus", headers=_h(admin_token)).json()
            mine = next(m for m in menus if m["id"] == mid)
            assert mine["meal_count"] == 20
        finally:
            requests.delete(f"{API}/menus/{mid}", headers=_h(admin_token))

    def test_put_meals_idempotent_upsert(self, admin_token):
        # Create a fresh menu so we can mutate freely
        rc = requests.post(f"{API}/menus", headers=_h(admin_token), json={
            "name": "TEST_menu_upsert", "valid_from": "2099-02-01", "valid_to": "2099-12-31"
        })
        mid = rc.json()["id"]
        try:
            payload = {"meals": [
                {"week": 1, "day": "Lunedi", "primo": "P1", "secondo": "S1", "contorno": "C1", "frutta": "F1"},
                {"week": 2, "day": "Martedi", "primo": "P2", "secondo": "S2", "contorno": "C2", "frutta": "F2"},
            ]}
            r1 = requests.put(f"{API}/menus/{mid}/meals", headers=_h(admin_token), json=payload)
            assert r1.status_code == 200
            # second identical call
            r2 = requests.put(f"{API}/menus/{mid}/meals", headers=_h(admin_token), json=payload)
            assert r2.status_code == 200
            # Still 20 rows total
            meals = requests.get(f"{API}/menus/{mid}/meals", headers=_h(admin_token)).json()
            assert len(meals) == 20
            # The two specified cells got values
            lun1 = next(m for m in meals if m["week"] == 1 and m["day"] == "Lunedi")
            assert lun1["primo"] == "P1" and lun1["frutta"] == "F1"
            mar2 = next(m for m in meals if m["week"] == 2 and m["day"] == "Martedi")
            assert mar2["primo"] == "P2"
            # Untouched cell remains empty
            ven4 = next(m for m in meals if m["week"] == 4 and m["day"] == "Venerdi")
            assert ven4["primo"] == ""
        finally:
            requests.delete(f"{API}/menus/{mid}", headers=_h(admin_token))

    def test_current_menu_returns_5_meals_and_week_1_to_4(self, admin_token, parent_token):
        # Admin call
        r = requests.get(f"{API}/menus/current", headers=_h(admin_token))
        assert r.status_code == 200
        body = r.json()
        assert body is not None
        assert "menu" in body and "current_week" in body and "meals" in body
        assert body["current_week"] in (1, 2, 3, 4)
        assert len(body["meals"]) == 5
        # Order Lunedi..Venerdi
        assert [m["day"] for m in body["meals"]] == DAYS_IT
        # Parent can also call /menus/current (gated only by get_current_user)
        rp = requests.get(f"{API}/menus/current", headers=_h(parent_token))
        assert rp.status_code == 200, rp.text
        bp = rp.json()
        assert bp is not None and bp["current_week"] in (1, 2, 3, 4)
        assert len(bp["meals"]) == 5

    def test_delete_menu_cascades_meals(self, admin_token):
        rc = requests.post(f"{API}/menus", headers=_h(admin_token), json={
            "name": "TEST_menu_del", "valid_from": "2099-03-01", "valid_to": "2099-12-31"
        })
        mid = rc.json()["id"]
        # confirm 20 meals
        assert len(requests.get(f"{API}/menus/{mid}/meals", headers=_h(admin_token)).json()) == 20
        rd = requests.delete(f"{API}/menus/{mid}", headers=_h(admin_token))
        assert rd.status_code == 200
        # After delete, the GET-meals endpoint backfills empties (doesn't 404),
        # but the menus list should NOT contain it anymore
        menus = requests.get(f"{API}/menus", headers=_h(admin_token)).json()
        assert not any(m["id"] == mid for m in menus)
        # Direct count via list endpoint must show 0 stored meals (only generated placeholders)
        # Since the GET fills placeholders, we verify via meal_count of a recreated empty namesake stays 0:
        # Better: check that all returned meals have id=None (placeholder)
        leftover = requests.get(f"{API}/menus/{mid}/meals", headers=_h(admin_token)).json()
        assert all(m.get("id") is None for m in leftover), "menu_meals not cascaded"

    def test_role_guards_parent_forbidden(self, parent_token, admin_token):
        menus = requests.get(f"{API}/menus", headers=_h(admin_token)).json()
        any_mid = menus[0]["id"]
        # POST /menus
        r1 = requests.post(f"{API}/menus", headers=_h(parent_token), json={
            "name": "TEST_pf", "valid_from": "2099-04-01", "valid_to": "2099-12-31"
        })
        assert r1.status_code == 403
        # PUT /menus/{id}/meals
        r2 = requests.put(f"{API}/menus/{any_mid}/meals", headers=_h(parent_token), json={"meals": []})
        assert r2.status_code == 403
        # DELETE /menus/{id}
        r3 = requests.delete(f"{API}/menus/{any_mid}", headers=_h(parent_token))
        assert r3.status_code == 403

    def test_role_guards_teacher_can_post_put_but_not_delete(self, teacher_token, admin_token):
        # teacher CAN create
        rc = requests.post(f"{API}/menus", headers=_h(teacher_token), json={
            "name": "TEST_menu_teach", "valid_from": "2099-05-01", "valid_to": "2099-12-31"
        })
        assert rc.status_code == 200
        mid = rc.json()["id"]
        # teacher CAN put meals
        rp = requests.put(f"{API}/menus/{mid}/meals", headers=_h(teacher_token), json={"meals": [
            {"week": 1, "day": "Lunedi", "primo": "TP", "secondo": "TS", "contorno": "TC", "frutta": "TF"}
        ]})
        assert rp.status_code == 200
        # teacher CANNOT delete (delete is admin-only)
        rd_t = requests.delete(f"{API}/menus/{mid}", headers=_h(teacher_token))
        assert rd_t.status_code == 403
        # admin cleanup
        requests.delete(f"{API}/menus/{mid}", headers=_h(admin_token))



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



# ============================================================
# STEP 1h - new entities
# ============================================================

TINY_PNG = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgAAIAAAUAAarVyFEAAAAASUVORK5CYII="
)


def _active_year(token):
    years = requests.get(f"{API}/school-years", headers=_h(token)).json()
    return next(y for y in years if y["is_active"])


def _rooms(token, year_id):
    return requests.get(f"{API}/classrooms?school_year_id={year_id}", headers=_h(token)).json()


# ---------- Lesson Plans ----------
class TestLessonPlans:
    def test_list_lesson_plans(self, admin_token):
        r = requests.get(f"{API}/lesson-plans", headers=_h(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1  # seeded

    def test_list_filter_by_classroom_and_year(self, admin_token):
        active = _active_year(admin_token)
        rooms = _rooms(admin_token, active["id"])
        cid = rooms[0]["id"]
        r = requests.get(
            f"{API}/lesson-plans?classroom_id={cid}&school_year_id={active['id']}",
            headers=_h(admin_token),
        )
        assert r.status_code == 200
        data = r.json()
        assert all(p["classroom_id"] == cid for p in data)

    def test_create_patch_delete(self, teacher_token, admin_token):
        active = _active_year(admin_token)
        rooms = _rooms(admin_token, active["id"])
        cid = rooms[0]["id"]
        payload = {
            "classroom_id": cid,
            "school_year_id": active["id"],
            "date_from": "2099-01-06",
            "date_to": "2099-01-10",
            "title": "TEST_plan",
            "body": "<p>contenuto</p>",
        }
        rc = requests.post(f"{API}/lesson-plans", headers=_h(teacher_token), json=payload)
        assert rc.status_code == 200
        pid = rc.json()["id"]
        # patch
        payload["title"] = "TEST_plan_upd"
        rp = requests.patch(f"{API}/lesson-plans/{pid}", headers=_h(teacher_token), json=payload)
        assert rp.status_code == 200 and rp.json()["title"] == "TEST_plan_upd"
        # delete
        rd = requests.delete(f"{API}/lesson-plans/{pid}", headers=_h(teacher_token))
        assert rd.status_code == 200

    def test_parent_cannot_create_lesson_plan(self, parent_token, admin_token):
        active = _active_year(admin_token)
        rooms = _rooms(admin_token, active["id"])
        r = requests.post(
            f"{API}/lesson-plans",
            headers=_h(parent_token),
            json={
                "classroom_id": rooms[0]["id"],
                "school_year_id": active["id"],
                "date_from": "2099-02-01",
                "date_to": "2099-02-07",
                "title": "TEST_parent_no",
                "body": "x",
            },
        )
        assert r.status_code == 403


# ---------- Communications ----------
class TestCommunications:
    def test_list_communications_media_no_base64(self, admin_token):
        r = requests.get(f"{API}/communications", headers=_h(admin_token))
        assert r.status_code == 200
        for c in r.json():
            assert "media" in c
            for m in c["media"]:
                assert "data_base64" not in m

    def test_create_patch_delete_communication(self, admin_token):
        payload = {
            "title": "TEST_com",
            "body": "<p>ciao</p>",
            "type": "avviso",
            "classroom_id": None,
            "media_ids": [],
        }
        rc = requests.post(f"{API}/communications", headers=_h(admin_token), json=payload)
        assert rc.status_code == 200
        cid = rc.json()["id"]
        payload["title"] = "TEST_com_upd"
        rp = requests.patch(f"{API}/communications/{cid}", headers=_h(admin_token), json=payload)
        assert rp.status_code == 200 and rp.json()["title"] == "TEST_com_upd"
        rd = requests.delete(f"{API}/communications/{cid}", headers=_h(admin_token))
        assert rd.status_code == 200

    def test_parent_cannot_create_communication(self, parent_token):
        r = requests.post(
            f"{API}/communications",
            headers=_h(parent_token),
            json={"title": "TEST_no", "body": "x", "type": "avviso", "media_ids": []},
        )
        assert r.status_code == 403


# ---------- Calendar Events ----------
class TestCalendarEvents:
    def test_list_filter_by_date(self, admin_token):
        r = requests.get(
            f"{API}/calendar-events?date_from=2025-09-01&date_to=2026-08-31",
            headers=_h(admin_token),
        )
        assert r.status_code == 200
        evs = r.json()
        assert len(evs) >= 1
        for e in evs:
            assert "2025-09-01" <= e["date"] <= "2026-08-31"

    def test_create_and_teacher_cannot_delete(self, admin_token, teacher_token):
        payload = {"name": "TEST_event", "date": "2099-03-15", "category": "altro", "notes": ""}
        rc = requests.post(f"{API}/calendar-events", headers=_h(admin_token), json=payload)
        assert rc.status_code == 200
        eid = rc.json()["id"]
        # teacher cannot delete
        rd = requests.delete(f"{API}/calendar-events/{eid}", headers=_h(teacher_token))
        assert rd.status_code == 403, f"teacher delete should be 403, got {rd.status_code}"
        # admin can
        ra = requests.delete(f"{API}/calendar-events/{eid}", headers=_h(admin_token))
        assert ra.status_code == 200


# ---------- Extra Labs ----------
class TestExtraLabs:
    def test_list_filter_by_classroom(self, admin_token):
        active = _active_year(admin_token)
        rooms = _rooms(admin_token, active["id"])
        cid = rooms[0]["id"]
        r = requests.get(f"{API}/extra-labs?classroom_id={cid}", headers=_h(admin_token))
        assert r.status_code == 200
        for lab in r.json():
            assert lab["classroom_id"] == cid

    def test_create_patch_delete_lab(self, teacher_token, admin_token):
        active = _active_year(admin_token)
        rooms = _rooms(admin_token, active["id"])
        cid = rooms[0]["id"]
        payload = {
            "classroom_id": cid,
            "day_of_week": "venerdì",
            "title": "TEST_lab",
            "teacher_name": "Maestra Test",
        }
        rc = requests.post(f"{API}/extra-labs", headers=_h(teacher_token), json=payload)
        assert rc.status_code == 200
        lid = rc.json()["id"]
        payload["title"] = "TEST_lab_upd"
        rp = requests.patch(f"{API}/extra-labs/{lid}", headers=_h(teacher_token), json=payload)
        assert rp.status_code == 200 and rp.json()["title"] == "TEST_lab_upd"
        rd = requests.delete(f"{API}/extra-labs/{lid}", headers=_h(teacher_token))
        assert rd.status_code == 200


# ---------- School Profile ----------
class TestSchoolProfile:
    def test_get_seeded_profile(self, admin_token):
        r = requests.get(f"{API}/school-profile", headers=_h(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert d.get("name") == "L'Albero della Vita"
        assert "Scafati" in (d.get("address") or "")

    def test_teacher_cannot_update_profile(self, teacher_token):
        r = requests.put(
            f"{API}/school-profile",
            headers=_h(teacher_token),
            json={"name": "hacked"},
        )
        assert r.status_code == 403

    def test_admin_can_update_profile(self, admin_token):
        # read current
        cur = requests.get(f"{API}/school-profile", headers=_h(admin_token)).json()
        # update with marker, then restore
        new_payload = {**{k: v for k, v in cur.items() if k not in ("_id", "id", "updated_at")},
                       "phone": "0818566418-TEST"}
        ru = requests.put(f"{API}/school-profile", headers=_h(admin_token), json=new_payload)
        assert ru.status_code == 200
        assert ru.json()["phone"] == "0818566418-TEST"
        # restore
        new_payload["phone"] = cur.get("phone", "0818566418")
        requests.put(f"{API}/school-profile", headers=_h(admin_token), json=new_payload)

    def test_public_school_profile_no_auth(self):
        r = requests.get(f"{API}/public/school-profile")
        assert r.status_code == 200
        d = r.json()
        assert d.get("name") == "L'Albero della Vita"


# ---------- Media ----------
class TestMedia:
    def test_admin_upload_and_list_excludes_base64(self, admin_token):
        active = _active_year(admin_token)
        rooms = _rooms(admin_token, active["id"])
        cid = rooms[0]["id"]
        rc = requests.post(
            f"{API}/media",
            headers=_h(admin_token),
            json={
                "filename": "TEST_img.png",
                "content_type": "image/png",
                "data_base64": TINY_PNG,
                "caption": "TEST_cap",
                "classroom_id": cid,
            },
        )
        assert rc.status_code == 200
        mid = rc.json()["id"]
        # list excludes data_base64
        rl = requests.get(f"{API}/media", headers=_h(admin_token))
        assert rl.status_code == 200
        found = next((m for m in rl.json() if m["id"] == mid), None)
        assert found is not None
        assert "data_base64" not in found
        # single returns full doc
        rg = requests.get(f"{API}/media/{mid}", headers=_h(admin_token))
        assert rg.status_code == 200
        assert rg.json().get("data_base64", "").startswith("data:image/png;base64,")
        # delete
        rd = requests.delete(f"{API}/media/{mid}", headers=_h(admin_token))
        assert rd.status_code == 200

    def test_parent_cannot_upload(self, parent_token):
        r = requests.post(
            f"{API}/media",
            headers=_h(parent_token),
            json={
                "filename": "p.png",
                "content_type": "image/png",
                "data_base64": TINY_PNG,
            },
        )
        assert r.status_code == 403

    def test_parent_sees_only_own_classroom_media(self, admin_token, parent_token):
        active = _active_year(admin_token)
        rooms = _rooms(admin_token, active["id"])
        # parent's child classroom
        kids = requests.get(f"{API}/parent/me/children", headers=_h(parent_token)).json()
        own_cid = kids[0]["classroom"]["id"]
        other_cid = next(r["id"] for r in rooms if r["id"] != own_cid)
        # upload one in own, one in other
        m_own = requests.post(
            f"{API}/media", headers=_h(admin_token),
            json={"filename": "TEST_own.png", "content_type": "image/png",
                  "data_base64": TINY_PNG, "classroom_id": own_cid},
        ).json()["id"]
        m_other = requests.post(
            f"{API}/media", headers=_h(admin_token),
            json={"filename": "TEST_other.png", "content_type": "image/png",
                  "data_base64": TINY_PNG, "classroom_id": other_cid},
        ).json()["id"]
        # parent list
        rl = requests.get(f"{API}/media", headers=_h(parent_token))
        assert rl.status_code == 200
        ids = {m["id"] for m in rl.json()}
        assert m_own in ids
        assert m_other not in ids, "parent should NOT see media from unrelated classroom"
        # cleanup
        requests.delete(f"{API}/media/{m_own}", headers=_h(admin_token))
        requests.delete(f"{API}/media/{m_other}", headers=_h(admin_token))


# ---------- Barcodes / Attendance ----------
class TestAttendance:
    def test_barcode_generate_upsert(self, admin_token):
        students = requests.get(f"{API}/students", headers=_h(admin_token)).json()
        sid = students[2]["id"]
        r1 = requests.post(f"{API}/barcodes", headers=_h(admin_token), json={"student_id": sid})
        assert r1.status_code == 200
        c1 = r1.json()["code"]
        # call again - upsert same student (single doc per student)
        r2 = requests.post(f"{API}/barcodes", headers=_h(admin_token), json={"student_id": sid})
        assert r2.status_code == 200
        # only one barcode per student
        all_b = requests.get(f"{API}/barcodes", headers=_h(admin_token)).json()
        count = sum(1 for b in all_b if b["student_id"] == sid)
        assert count == 1, f"expected 1 barcode per student, got {count}"
        # the latest code should be in the list
        latest = r2.json()["code"]
        assert any(b["student_id"] == sid and b["code"] == latest for b in all_b)

    def test_attendance_in_with_valid_barcode(self, admin_token):
        barcodes = requests.get(f"{API}/barcodes", headers=_h(admin_token)).json()
        assert barcodes, "no barcodes available"
        b = barcodes[0]
        r = requests.post(
            f"{API}/attendance",
            headers=_h(admin_token),
            json={"barcode": b["code"], "action": "in"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["student"]["id"] == b["student_id"]
        assert data["entry"]["action"] == "in"

    def test_attendance_invalid_barcode_404(self, admin_token):
        r = requests.post(
            f"{API}/attendance",
            headers=_h(admin_token),
            json={"barcode": "INVALID-XYZ-9999", "action": "in"},
        )
        assert r.status_code == 404

    def test_attendance_out_by_student_id(self, admin_token):
        students = requests.get(f"{API}/students", headers=_h(admin_token)).json()
        sid = students[1]["id"]
        r = requests.post(
            f"{API}/attendance",
            headers=_h(admin_token),
            json={"student_id": sid, "action": "out"},
        )
        assert r.status_code == 200
        assert r.json()["entry"]["action"] == "out"

    def test_attendance_list_filter(self, admin_token):
        from datetime import date as _date
        today = _date.today().isoformat()
        active = _active_year(admin_token)
        rooms = _rooms(admin_token, active["id"])
        cid = rooms[0]["id"]
        r = requests.get(
            f"{API}/attendance?date_str={today}&classroom_id={cid}&school_year_id={active['id']}",
            headers=_h(admin_token),
        )
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for entry in data:
            assert entry["date"] == today


# ---------- Parent-facing new ----------
class TestParentNewEndpoints:
    def test_parent_lesson_plans(self, parent_token):
        r = requests.get(f"{API}/parent/me/lesson-plans", headers=_h(parent_token))
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # parent's child is in Coccinelle which has 1 seeded plan
        assert len(data) >= 1

    def test_parent_lesson_plans_scoped_to_own_classroom(self, parent_token, admin_token):
        kids = requests.get(f"{API}/parent/me/children", headers=_h(parent_token)).json()
        own_cid = kids[0]["classroom"]["id"]
        r = requests.get(f"{API}/parent/me/lesson-plans", headers=_h(parent_token))
        for p in r.json():
            assert p["classroom_id"] == own_cid, "parent saw plan from another classroom"

    def test_parent_communications_with_media(self, parent_token):
        r = requests.get(f"{API}/parent/me/communications", headers=_h(parent_token))
        assert r.status_code == 200
        for c in r.json():
            assert "media" in c

    def test_parent_extra_labs(self, parent_token):
        r = requests.get(f"{API}/parent/me/extra-labs", headers=_h(parent_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1


# ---------------- Activities BULK (STEP 5: "Compila tutta la sezione") ----------------
class TestActivitiesBulk:
    """POST /api/activities/bulk applies a single activity card to all enrolled students
    of a classroom for a given date. Verifies skip/overwrite, only_student_ids,
    role guards, edge cases, idempotency, and per-student row creation."""

    BULK_DATE = "2026-05-25"  # future date with no existing activities

    def _get_coccinelle_and_students(self, admin_token):
        years = requests.get(f"{API}/school-years", headers=_h(admin_token)).json()
        active = next(y for y in years if y["is_active"])
        rooms = requests.get(f"{API}/classrooms?school_year_id={active['id']}", headers=_h(admin_token)).json()
        coc = next((r for r in rooms if r["name"].lower().startswith("coccinelle")), rooms[0])
        # Use enrollment-scoped endpoint (mirrors what bulk endpoint queries)
        students = requests.get(
            f"{API}/classrooms/{coc['id']}/students?school_year_id={active['id']}",
            headers=_h(admin_token),
        ).json()
        return active["id"], coc["id"], [s["id"] for s in students]

    def _cleanup(self, admin_token, student_ids, date_str):
        """Delete any activity row for these students on date_str."""
        for sid in student_ids:
            rows = requests.get(
                f"{API}/activities?student_id={sid}&date_from={date_str}&date_to={date_str}",
                headers=_h(admin_token),
            ).json()
            for a in rows:
                requests.delete(f"{API}/activities/{a['id']}", headers=_h(admin_token))

    def test_bulk_apply_to_all_students_creates_separate_rows(self, admin_token):
        yid, cid, sids = self._get_coccinelle_and_students(admin_token)
        assert len(sids) >= 2, "Coccinelle must have >=2 students for this test"
        self._cleanup(admin_token, sids, self.BULK_DATE)
        try:
            payload = {
                "classroom_id": cid,
                "school_year_id": yid,
                "date": self.BULK_DATE,
                "overwrite_existing": False,
                "didattica": "Partecipato",
                "pranzo": "Ha mangiato",
                "merenda": "Si",
                "note": "TEST_bulk_all",
            }
            r = requests.post(f"{API}/activities/bulk", headers=_h(admin_token), json=payload)
            assert r.status_code == 200, r.text
            body = r.json()
            assert set(body.keys()) >= {"applied", "skipped", "students_modified"}
            assert body["applied"] == len(sids)
            assert body["skipped"] == 0
            assert set(body["students_modified"]) == set(sids)

            # Verify SEPARATE rows per student (not a shared doc)
            for sid in sids:
                rows = requests.get(
                    f"{API}/activities?student_id={sid}&date_from={self.BULK_DATE}&date_to={self.BULK_DATE}",
                    headers=_h(admin_token),
                ).json()
                assert len(rows) == 1, f"student {sid} should have 1 row, got {len(rows)}"
                assert rows[0]["student_id"] == sid
                assert rows[0]["date"] == self.BULK_DATE
                assert rows[0]["didattica"] == "Partecipato"
                assert rows[0]["pranzo"] == "Ha mangiato"
                assert rows[0]["note"] == "TEST_bulk_all"
        finally:
            self._cleanup(admin_token, sids, self.BULK_DATE)

    def test_bulk_overwrite_false_skips_existing(self, admin_token):
        yid, cid, sids = self._get_coccinelle_and_students(admin_token)
        self._cleanup(admin_token, sids, self.BULK_DATE)
        try:
            # Pre-create activity for FIRST student only
            pre = requests.post(f"{API}/activities", headers=_h(admin_token), json={
                "student_id": sids[0], "date": self.BULK_DATE,
                "didattica": "Non ha Partecipato", "note": "TEST_preexisting",
            })
            assert pre.status_code == 200

            r = requests.post(f"{API}/activities/bulk", headers=_h(admin_token), json={
                "classroom_id": cid, "school_year_id": yid, "date": self.BULK_DATE,
                "overwrite_existing": False,
                "didattica": "Partecipato", "note": "TEST_bulk_skip",
            })
            assert r.status_code == 200
            body = r.json()
            assert body["skipped"] == 1, body
            assert body["applied"] == len(sids) - 1
            assert sids[0] not in body["students_modified"]

            # Verify the pre-existing row was NOT changed
            rows = requests.get(
                f"{API}/activities?student_id={sids[0]}&date_from={self.BULK_DATE}&date_to={self.BULK_DATE}",
                headers=_h(admin_token),
            ).json()
            assert rows[0]["didattica"] == "Non ha Partecipato"
            assert rows[0]["note"] == "TEST_preexisting"
        finally:
            self._cleanup(admin_token, sids, self.BULK_DATE)

    def test_bulk_overwrite_true_overwrites_existing(self, admin_token):
        yid, cid, sids = self._get_coccinelle_and_students(admin_token)
        self._cleanup(admin_token, sids, self.BULK_DATE)
        try:
            requests.post(f"{API}/activities", headers=_h(admin_token), json={
                "student_id": sids[0], "date": self.BULK_DATE,
                "didattica": "Non ha Partecipato", "note": "TEST_preexisting",
            })

            r = requests.post(f"{API}/activities/bulk", headers=_h(admin_token), json={
                "classroom_id": cid, "school_year_id": yid, "date": self.BULK_DATE,
                "overwrite_existing": True,
                "didattica": "Partecipato", "note": "TEST_bulk_overwrite",
            })
            assert r.status_code == 200
            body = r.json()
            assert body["applied"] == len(sids), body
            assert body["skipped"] == 0

            # Verify pre-existing row WAS overwritten
            rows = requests.get(
                f"{API}/activities?student_id={sids[0]}&date_from={self.BULK_DATE}&date_to={self.BULK_DATE}",
                headers=_h(admin_token),
            ).json()
            assert rows[0]["didattica"] == "Partecipato"
            assert rows[0]["note"] == "TEST_bulk_overwrite"
        finally:
            self._cleanup(admin_token, sids, self.BULK_DATE)

    def test_bulk_only_student_ids_subset(self, admin_token):
        yid, cid, sids = self._get_coccinelle_and_students(admin_token)
        assert len(sids) >= 2
        self._cleanup(admin_token, sids, self.BULK_DATE)
        try:
            subset = [sids[0]]  # only the first one
            r = requests.post(f"{API}/activities/bulk", headers=_h(admin_token), json={
                "classroom_id": cid, "school_year_id": yid, "date": self.BULK_DATE,
                "overwrite_existing": False,
                "only_student_ids": subset,
                "didattica": "Partecipato", "note": "TEST_bulk_subset",
            })
            assert r.status_code == 200, r.text
            body = r.json()
            assert body["applied"] == 1
            assert body["students_modified"] == subset

            # Only subset student has a row; others do NOT
            rows0 = requests.get(
                f"{API}/activities?student_id={sids[0]}&date_from={self.BULK_DATE}&date_to={self.BULK_DATE}",
                headers=_h(admin_token),
            ).json()
            assert len(rows0) == 1
            for sid in sids[1:]:
                rows = requests.get(
                    f"{API}/activities?student_id={sid}&date_from={self.BULK_DATE}&date_to={self.BULK_DATE}",
                    headers=_h(admin_token),
                ).json()
                assert len(rows) == 0, f"student {sid} should NOT have a row"
        finally:
            self._cleanup(admin_token, sids, self.BULK_DATE)

    def test_bulk_parent_forbidden(self, parent_token, admin_token):
        yid, cid, _sids = self._get_coccinelle_and_students(admin_token)
        r = requests.post(f"{API}/activities/bulk", headers=_h(parent_token), json={
            "classroom_id": cid, "school_year_id": yid, "date": self.BULK_DATE,
            "didattica": "Partecipato",
        })
        assert r.status_code == 403, f"parent should get 403, got {r.status_code}"

    def test_bulk_teacher_allowed(self, teacher_token, admin_token):
        yid, cid, sids = self._get_coccinelle_and_students(admin_token)
        self._cleanup(admin_token, sids, self.BULK_DATE)
        try:
            r = requests.post(f"{API}/activities/bulk", headers=_h(teacher_token), json={
                "classroom_id": cid, "school_year_id": yid, "date": self.BULK_DATE,
                "overwrite_existing": True,
                "didattica": "Partecipato", "note": "TEST_bulk_teacher",
            })
            assert r.status_code == 200, r.text
            assert r.json()["applied"] == len(sids)
        finally:
            self._cleanup(admin_token, sids, self.BULK_DATE)

    def test_bulk_nonexistent_classroom_returns_zero(self, admin_token):
        yid, _cid, _sids = self._get_coccinelle_and_students(admin_token)
        r = requests.post(f"{API}/activities/bulk", headers=_h(admin_token), json={
            "classroom_id": "non-existent-classroom-id-xyz",
            "school_year_id": yid, "date": self.BULK_DATE,
            "didattica": "Partecipato",
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["applied"] == 0
        assert body["skipped"] == 0
        assert body["students_modified"] == []

    def test_bulk_idempotency_twice_with_overwrite_false(self, admin_token):
        yid, cid, sids = self._get_coccinelle_and_students(admin_token)
        self._cleanup(admin_token, sids, self.BULK_DATE)
        try:
            payload = {
                "classroom_id": cid, "school_year_id": yid, "date": self.BULK_DATE,
                "overwrite_existing": False,
                "didattica": "Partecipato", "note": "TEST_bulk_idem",
            }
            r1 = requests.post(f"{API}/activities/bulk", headers=_h(admin_token), json=payload)
            assert r1.status_code == 200
            assert r1.json()["applied"] == len(sids)
            assert r1.json()["skipped"] == 0

            r2 = requests.post(f"{API}/activities/bulk", headers=_h(admin_token), json=payload)
            assert r2.status_code == 200
            body2 = r2.json()
            assert body2["applied"] == 0, body2
            assert body2["skipped"] == len(sids), body2
            assert body2["students_modified"] == []

            # Still exactly N rows total (no duplicates)
            for sid in sids:
                rows = requests.get(
                    f"{API}/activities?student_id={sid}&date_from={self.BULK_DATE}&date_to={self.BULK_DATE}",
                    headers=_h(admin_token),
                ).json()
                assert len(rows) == 1
        finally:
            self._cleanup(admin_token, sids, self.BULK_DATE)


# ---------------- Regression: suggestions / last-before / replicate-from ----------------
class TestActivitiesAuxRegression:
    def test_suggestions_admin(self, admin_token):
        students = requests.get(f"{API}/students", headers=_h(admin_token)).json()
        sid = students[0]["id"]
        r = requests.get(
            f"{API}/activities/suggestions?student_id={sid}&date_str=2026-05-25",
            headers=_h(admin_token),
        )
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ("note_pranzo", "note_didattica", "note_motoria", "sources"):
            assert k in body

    def test_suggestions_parent_forbidden(self, parent_token):
        r = requests.get(
            f"{API}/activities/suggestions?student_id=any&date_str=2026-05-25",
            headers=_h(parent_token),
        )
        assert r.status_code == 403

    def test_last_before_for_alice(self, admin_token, parent_token):
        kids = requests.get(f"{API}/parent/me/children", headers=_h(parent_token)).json()
        alice_id = kids[0]["id"]
        # Alice has a seeded activity for today; ask for something well in the future
        r = requests.get(
            f"{API}/activities/last-before?student_id={alice_id}&before_date=2099-01-01",
            headers=_h(admin_token),
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "source_date" in body
        for k in ("didattica", "motoria", "pranzo", "merenda", "riposo", "cacca", "pipi"):
            assert k in body

    def test_last_before_404_when_none(self, admin_token):
        students = requests.get(f"{API}/students", headers=_h(admin_token)).json()
        # Use a student who likely has no activities before 1900
        sid = students[-1]["id"]
        r = requests.get(
            f"{API}/activities/last-before?student_id={sid}&before_date=1900-01-01",
            headers=_h(admin_token),
        )
        assert r.status_code == 404

    def test_replicate_from_404_when_missing(self, admin_token):
        students = requests.get(f"{API}/students", headers=_h(admin_token)).json()
        sid = students[0]["id"]
        r = requests.get(
            f"{API}/activities/replicate-from?student_id={sid}&from_date=1900-01-01",
            headers=_h(admin_token),
        )
        assert r.status_code == 404
