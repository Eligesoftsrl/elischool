"""
Iteration 10 — Tests for POST /api/teachers/{id}/reset-password and parent card email exposure.
"""
import os
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # fallback: read frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip("/")

ADMIN_EMAIL = "admin@scuolapp.it"
ADMIN_PWD = "Admin2026!"


def _login(email, password):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed {email}: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def admin():
    return _login(ADMIN_EMAIL, ADMIN_PWD)


@pytest.fixture(scope="module")
def created_teacher(admin):
    """Create a dedicated test teacher for reset tests, cleanup at end."""
    payload = {
        "first_name": "TESTIter10",
        "last_name": "ResetTarget",
        "email": "test.iter10.reset@scuolapp.it",
        "phone": "",
        "role": "teacher",
        "password": "InitialPwd2026!",
        "notes": "",
    }
    # best-effort cleanup if a previous run left it behind
    r = admin.get(f"{BASE_URL}/api/teachers")
    for t in r.json():
        if t.get("email") == payload["email"]:
            admin.delete(f"{BASE_URL}/api/teachers/{t['id']}")
    r = admin.post(f"{BASE_URL}/api/teachers", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    yield data, payload
    # teardown
    try:
        admin.delete(f"{BASE_URL}/api/teachers/{data['id']}")
    except Exception:
        pass


# --- Create endpoint now returns email_sent ---
def test_create_teacher_returns_email_sent(created_teacher):
    data, _ = created_teacher
    assert "email_sent" in data
    assert isinstance(data["email_sent"], bool)
    assert data["role"] == "teacher"
    assert "password_hash" not in data


# --- Reset password happy path ---
def test_reset_password_admin_ok(admin, created_teacher):
    data, _ = created_teacher
    tid = data["id"]
    r = admin.post(f"{BASE_URL}/api/teachers/{tid}/reset-password")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("ok") is True
    assert body.get("email") == data["email"]
    assert isinstance(body.get("password"), str) and len(body["password"]) >= 8
    assert "email_sent" in body and isinstance(body["email_sent"], bool)
    # pattern: Word+Word+3 digits+!
    assert re.match(r"^[A-Z][a-z]+[A-Z][a-z]+\d{3}!$", body["password"]), f"Pattern mismatch: {body['password']}"


# --- E2E: new password works, old one rejected ---
def test_reset_password_e2e_login(admin, created_teacher):
    data, payload = created_teacher
    tid = data["id"]
    r = admin.post(f"{BASE_URL}/api/teachers/{tid}/reset-password")
    assert r.status_code == 200
    new_pwd = r.json()["password"]

    # New password works
    s_new = requests.Session()
    rn = s_new.post(f"{BASE_URL}/api/auth/login", json={"email": data["email"], "password": new_pwd})
    assert rn.status_code == 200, f"new pwd login failed: {rn.text}"

    # Old password rejected
    s_old = requests.Session()
    ro = s_old.post(f"{BASE_URL}/api/auth/login", json={"email": data["email"], "password": payload["password"]})
    assert ro.status_code in (400, 401, 403), f"old pwd should fail, got {ro.status_code}"


# --- RBAC: non-admin forbidden ---
def test_reset_password_non_admin_forbidden(created_teacher):
    data, _ = created_teacher
    tid = data["id"]
    # Use a known teacher account. maestra.giulia password may have changed; try to use the one we just created with its new pwd
    # Reset once to get a known pwd for the test teacher, then login as that teacher
    admin = _login(ADMIN_EMAIL, ADMIN_PWD)
    r = admin.post(f"{BASE_URL}/api/teachers/{tid}/reset-password")
    assert r.status_code == 200
    pwd = r.json()["password"]
    teacher_sess = _login(data["email"], pwd)
    r2 = teacher_sess.post(f"{BASE_URL}/api/teachers/{tid}/reset-password")
    assert r2.status_code == 403, f"expected 403 got {r2.status_code} {r2.text}"


# --- 404s ---
def test_reset_password_nonexistent_id(admin):
    r = admin.post(f"{BASE_URL}/api/teachers/does-not-exist-xyz/reset-password")
    assert r.status_code == 404
    assert "Maestra non trovata" in r.text or "not found" in r.text.lower()


def test_reset_password_on_parent_returns_404(admin):
    # Create a parent, then try to reset
    import time
    pemail = f"test.iter10.parent.{int(time.time())}@scuolapp.it"
    payload = {"first_name": "TestP", "last_name": "ParentIter10", "email": pemail, "phone": "", "student_ids": []}
    rp = admin.post(f"{BASE_URL}/api/parents", json=payload)
    assert rp.status_code == 200, rp.text
    parent = rp.json()
    pid = parent.get("id") or parent.get("user_id")
    try:
        r = admin.post(f"{BASE_URL}/api/teachers/{pid}/reset-password")
        assert r.status_code == 404, f"expected 404, got {r.status_code}: {r.text}"
    finally:
        # cleanup parent
        try:
            admin.delete(f"{BASE_URL}/api/parents/{pid}")
        except Exception:
            pass


# --- Password generator uniqueness ---
def test_reset_password_statistical_uniqueness(admin, created_teacher):
    data, _ = created_teacher
    tid = data["id"]
    pwds = set()
    for _ in range(10):
        r = admin.post(f"{BASE_URL}/api/teachers/{tid}/reset-password")
        assert r.status_code == 200
        pwds.add(r.json()["password"])
    assert len(pwds) >= 8, f"Expected ~10 unique passwords, got {len(pwds)}: {pwds}"


# --- Parent card data: GET parents returns email field ---
def test_parent_has_email_field(admin):
    r = admin.get(f"{BASE_URL}/api/parents")
    assert r.status_code == 200
    items = r.json()
    if items:
        for p in items:
            assert "email" in p, "parent object should include email for card display"
