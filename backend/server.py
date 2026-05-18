from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import secrets
import logging
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# ----------------------------- App & DB -----------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Scuola Infanzia API")
api = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]


# ----------------------------- Helpers -----------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=14),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=12 * 3600, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax", max_age=14 * 24 * 3600, path="/")


def clear_auth_cookies(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def gen_id() -> str:
    return str(uuid.uuid4())


def clean_doc(doc):
    if doc is None:
        return None
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Non autenticato")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token non valido")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    user.pop("password_hash", None)
    return user


def require_role(*roles):
    async def checker(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Permesso negato")
        return user
    return checker


# ----------------------------- Models -----------------------------
class LoginInput(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordInput(BaseModel):
    email: EmailStr


class ResetPasswordInput(BaseModel):
    token: str
    password: str


class SetupPasswordInput(BaseModel):
    token: str
    password: str


class SchoolYearIn(BaseModel):
    label: str  # e.g. "2025/2026"
    start_date: str  # YYYY-MM-DD
    end_date: str
    is_active: bool = False


class ClassroomIn(BaseModel):
    name: str  # e.g. "Coccinelle"
    age_band: str  # e.g. "3-4 anni"
    notes: Optional[str] = ""
    school_year_id: str
    teacher_ids: List[str] = []


class StudentIn(BaseModel):
    first_name: str
    last_name: str
    birth_date: Optional[str] = None
    fiscal_code: Optional[str] = ""
    residence: Optional[str] = ""
    allergies: Optional[str] = ""
    notes: Optional[str] = ""


class EnrollmentIn(BaseModel):
    student_id: str
    classroom_id: str
    school_year_id: str


class TransferIn(BaseModel):
    student_id: str
    to_classroom_id: str
    school_year_id: str


class YearTransitionIn(BaseModel):
    from_year_id: str
    to_year_id: str
    mapping: List[dict]  # [{from_classroom_id, to_classroom_id}]


class TeacherIn(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = ""
    role: Literal["teacher", "admin"] = "teacher"
    password: Optional[str] = None  # if admin sets one
    notes: Optional[str] = ""


class ParentIn(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = ""
    notes: Optional[str] = ""
    student_ids: List[str] = []  # children


class ActivityIn(BaseModel):
    student_id: str
    date: str  # YYYY-MM-DD
    didattica: Optional[str] = ""        # "Partecipato" | "Non ha Partecipato"
    note_didattica: Optional[str] = ""
    motoria: Optional[str] = ""          # "Partecipato" | "Non ha Partecipato"
    note_motoria: Optional[str] = ""
    pranzo: Optional[str] = ""           # "Ha mangiato" | "Non ha mangiato" | "Ha mangiato poco"
    note_pranzo: Optional[str] = ""
    merenda: Optional[str] = ""          # "Si" | "No"
    riposo: Optional[str] = ""           # "Si" | "No"
    cacca: Optional[str] = ""            # "Si" | "No"
    pipi: Optional[str] = ""             # "Si" | "No"
    note: Optional[str] = ""


class BulkActivityIn(BaseModel):
    classroom_id: str
    school_year_id: str
    date: str
    overwrite_existing: bool = False
    # Activity fields (same as ActivityIn minus student_id+date)
    didattica: Optional[str] = ""
    note_didattica: Optional[str] = ""
    motoria: Optional[str] = ""
    note_motoria: Optional[str] = ""
    pranzo: Optional[str] = ""
    note_pranzo: Optional[str] = ""
    merenda: Optional[str] = ""
    riposo: Optional[str] = ""
    cacca: Optional[str] = ""
    pipi: Optional[str] = ""
    note: Optional[str] = ""
    only_student_ids: Optional[List[str]] = None  # if provided, restrict to these students


# Rotating multi-week menu (4 settimane × 5 giorni) — matches user's MySQL schema
class MenuIn(BaseModel):
    name: str
    valid_from: str
    valid_to: str
    notes: Optional[str] = ""
    school_year_id: Optional[str] = None


class MealIn(BaseModel):
    week: int  # 1..4
    day: str   # "Lunedi" | "Martedi" | "Mercoledi" | "Giovedi" | "Venerdi"
    primo: Optional[str] = ""
    secondo: Optional[str] = ""
    contorno: Optional[str] = ""
    frutta: Optional[str] = ""


class MealsBulkIn(BaseModel):
    meals: List[MealIn]


class NewsIn(BaseModel):
    title: str
    body: str
    category: str = "generale"  # generale, evento, avviso
    classroom_id: Optional[str] = None  # if class-specific
    publish_date: Optional[str] = None


# ----------------------------- AUTH -----------------------------
@api.post("/auth/login")
async def login(payload: LoginInput, response: Response):
    email = payload.email.lower().strip()
    # Brute force check
    identifier = email
    attempts = await db.login_attempts.find_one({"identifier": identifier})
    if attempts and attempts.get("locked_until"):
        lu = datetime.fromisoformat(attempts["locked_until"])
        if lu > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Troppi tentativi. Riprova tra qualche minuto.")

    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(payload.password, user["password_hash"]):
        # increment attempts
        count = (attempts["count"] + 1) if attempts else 1
        update = {"identifier": identifier, "count": count, "last_attempt": now_iso()}
        if count >= 5:
            update["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
            update["count"] = 0
        await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)
        raise HTTPException(status_code=401, detail="Email o password errati")

    if user.get("status") == "pending":
        raise HTTPException(status_code=403, detail="Account non ancora attivato. Completa l'invito ricevuto.")

    await db.login_attempts.delete_one({"identifier": identifier})

    access = create_access_token(user["id"], user["email"], user["role"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)

    user_safe = clean_doc(dict(user))
    return {"user": user_safe, "access_token": access}


@api.post("/auth/logout")
async def logout(response: Response, user=Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    tok = request.cookies.get("refresh_token")
    if not tok:
        raise HTTPException(status_code=401, detail="Manca refresh token")
    try:
        payload = jwt.decode(tok, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token non valido")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token non valido")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    access = create_access_token(user["id"], user["email"], user["role"])
    response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=12 * 3600, path="/")
    return {"ok": True}


@api.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordInput):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    # always respond 200 to avoid enumeration
    if not user:
        return {"ok": True, "mock_message": "Se l'email esiste, riceverai un link di reset."}
    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({
        "token": token,
        "user_id": user["id"],
        "created_at": now_iso(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        "used": False,
    })
    reset_link = f"{os.environ.get('FRONTEND_URL', '')}/reset-password/{token}"
    logger.info(f"[MOCK EMAIL] Password reset link for {email}: {reset_link}")
    # MOCK: return the link in the response for testing
    return {"ok": True, "mock_reset_link": reset_link, "mock_token": token}


@api.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordInput):
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="La password deve avere almeno 8 caratteri")
    t = await db.password_reset_tokens.find_one({"token": payload.token})
    if not t or t.get("used"):
        raise HTTPException(status_code=400, detail="Token non valido o già usato")
    if datetime.fromisoformat(t["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token scaduto")
    await db.users.update_one({"id": t["user_id"]}, {"$set": {"password_hash": hash_password(payload.password), "status": "active"}})
    await db.password_reset_tokens.update_one({"token": payload.token}, {"$set": {"used": True}})
    return {"ok": True}


@api.post("/auth/setup-password")
async def setup_password(payload: SetupPasswordInput):
    """Used by invited parents to set their first password."""
    return await reset_password(ResetPasswordInput(token=payload.token, password=payload.password))


# ----------------------------- SCHOOL YEARS -----------------------------
@api.get("/school-years")
async def list_years(user=Depends(get_current_user)):
    docs = await db.school_years.find({}, {"_id": 0}).sort("start_date", -1).to_list(200)
    return docs


@api.post("/school-years")
async def create_year(payload: SchoolYearIn, user=Depends(require_role("admin"))):
    doc = payload.model_dump()
    doc["id"] = gen_id()
    doc["created_at"] = now_iso()
    if doc["is_active"]:
        await db.school_years.update_many({}, {"$set": {"is_active": False}})
    await db.school_years.insert_one(doc)
    return clean_doc(doc)


@api.patch("/school-years/{year_id}")
async def update_year(year_id: str, payload: SchoolYearIn, user=Depends(require_role("admin"))):
    if payload.is_active:
        await db.school_years.update_many({}, {"$set": {"is_active": False}})
    await db.school_years.update_one({"id": year_id}, {"$set": payload.model_dump()})
    doc = await db.school_years.find_one({"id": year_id}, {"_id": 0})
    return doc


@api.post("/school-years/{year_id}/activate")
async def activate_year(year_id: str, user=Depends(require_role("admin"))):
    await db.school_years.update_many({}, {"$set": {"is_active": False}})
    await db.school_years.update_one({"id": year_id}, {"$set": {"is_active": True}})
    doc = await db.school_years.find_one({"id": year_id}, {"_id": 0})
    return doc


@api.delete("/school-years/{year_id}")
async def delete_year(year_id: str, user=Depends(require_role("admin"))):
    await db.school_years.delete_one({"id": year_id})
    return {"ok": True}


# ----------------------------- CLASSROOMS -----------------------------
@api.get("/classrooms")
async def list_classrooms(school_year_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if school_year_id:
        q["school_year_id"] = school_year_id
    docs = await db.classrooms.find(q, {"_id": 0}).to_list(500)
    # enrich with counts
    for d in docs:
        d["student_count"] = await db.enrollments.count_documents({"classroom_id": d["id"], "school_year_id": d["school_year_id"]})
    return docs


@api.post("/classrooms")
async def create_classroom(payload: ClassroomIn, user=Depends(require_role("admin", "teacher"))):
    doc = payload.model_dump()
    doc["id"] = gen_id()
    doc["created_at"] = now_iso()
    await db.classrooms.insert_one(doc)
    return clean_doc(doc)


@api.patch("/classrooms/{cid}")
async def update_classroom(cid: str, payload: ClassroomIn, user=Depends(require_role("admin", "teacher"))):
    await db.classrooms.update_one({"id": cid}, {"$set": payload.model_dump()})
    return await db.classrooms.find_one({"id": cid}, {"_id": 0})


@api.delete("/classrooms/{cid}")
async def delete_classroom(cid: str, user=Depends(require_role("admin"))):
    await db.classrooms.delete_one({"id": cid})
    await db.enrollments.delete_many({"classroom_id": cid})
    return {"ok": True}


@api.get("/classrooms/{cid}/students")
async def classroom_students(cid: str, school_year_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {"classroom_id": cid}
    if school_year_id:
        q["school_year_id"] = school_year_id
    enrolls = await db.enrollments.find(q, {"_id": 0}).to_list(500)
    students = []
    for e in enrolls:
        s = await db.students.find_one({"id": e["student_id"]}, {"_id": 0})
        if s:
            students.append(s)
    return students


# ----------------------------- STUDENTS -----------------------------
@api.get("/students")
async def list_students(q: Optional[str] = None, school_year_id: Optional[str] = None, user=Depends(get_current_user)):
    query = {}
    if q:
        query["$or"] = [
            {"first_name": {"$regex": q, "$options": "i"}},
            {"last_name": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.students.find(query, {"_id": 0}).sort("last_name", 1).to_list(1000)
    if school_year_id:
        for d in docs:
            e = await db.enrollments.find_one({"student_id": d["id"], "school_year_id": school_year_id}, {"_id": 0})
            d["enrollment"] = e
    return docs


@api.get("/students/{sid}")
async def get_student(sid: str, school_year_id: Optional[str] = None, user=Depends(get_current_user)):
    s = await db.students.find_one({"id": sid}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Alunno non trovato")
    if school_year_id:
        s["enrollment"] = await db.enrollments.find_one({"student_id": sid, "school_year_id": school_year_id}, {"_id": 0})
        if s["enrollment"]:
            c = await db.classrooms.find_one({"id": s["enrollment"]["classroom_id"]}, {"_id": 0})
            s["enrollment"]["classroom"] = c
    return s


@api.post("/students")
async def create_student(payload: StudentIn, user=Depends(require_role("admin", "teacher"))):
    doc = payload.model_dump()
    doc["id"] = gen_id()
    doc["created_at"] = now_iso()
    await db.students.insert_one(doc)
    return clean_doc(doc)


@api.patch("/students/{sid}")
async def update_student(sid: str, payload: StudentIn, user=Depends(require_role("admin", "teacher"))):
    await db.students.update_one({"id": sid}, {"$set": payload.model_dump()})
    return await db.students.find_one({"id": sid}, {"_id": 0})


@api.delete("/students/{sid}")
async def delete_student(sid: str, user=Depends(require_role("admin"))):
    await db.students.delete_one({"id": sid})
    await db.enrollments.delete_many({"student_id": sid})
    await db.parent_links.delete_many({"student_id": sid})
    return {"ok": True}


# ----------------------------- ENROLLMENTS / TRANSFERS -----------------------------
@api.post("/enrollments")
async def create_enrollment(payload: EnrollmentIn, user=Depends(require_role("admin", "teacher"))):
    # ensure unique per student+year
    await db.enrollments.delete_many({"student_id": payload.student_id, "school_year_id": payload.school_year_id})
    doc = payload.model_dump()
    doc["id"] = gen_id()
    doc["created_at"] = now_iso()
    await db.enrollments.insert_one(doc)
    return clean_doc(doc)


@api.post("/enrollments/transfer")
async def transfer_student(payload: TransferIn, user=Depends(require_role("admin", "teacher"))):
    """Move a student from current class to another within same year."""
    existing = await db.enrollments.find_one({"student_id": payload.student_id, "school_year_id": payload.school_year_id})
    if existing:
        await db.enrollments.update_one({"id": existing["id"]}, {"$set": {"classroom_id": payload.to_classroom_id, "updated_at": now_iso()}})
        await db.transfers_log.insert_one({
            "id": gen_id(),
            "student_id": payload.student_id,
            "from_classroom_id": existing["classroom_id"],
            "to_classroom_id": payload.to_classroom_id,
            "school_year_id": payload.school_year_id,
            "moved_at": now_iso(),
            "by_user_id": user["id"],
        })
    else:
        await db.enrollments.insert_one({
            "id": gen_id(),
            "student_id": payload.student_id,
            "classroom_id": payload.to_classroom_id,
            "school_year_id": payload.school_year_id,
            "created_at": now_iso(),
        })
    return {"ok": True}


@api.post("/year-transition")
async def year_transition(payload: YearTransitionIn, user=Depends(require_role("admin"))):
    """Bulk-promote students to new year using a mapping of classes."""
    moved = 0
    for m in payload.mapping:
        from_c = m["from_classroom_id"]
        to_c = m["to_classroom_id"]
        students = await db.enrollments.find({"classroom_id": from_c, "school_year_id": payload.from_year_id}).to_list(1000)
        for e in students:
            await db.enrollments.update_one(
                {"student_id": e["student_id"], "school_year_id": payload.to_year_id},
                {"$set": {"classroom_id": to_c, "student_id": e["student_id"], "school_year_id": payload.to_year_id, "id": gen_id(), "created_at": now_iso()}},
                upsert=True,
            )
            moved += 1
    return {"ok": True, "moved": moved}


# ----------------------------- TEACHERS (also as users) -----------------------------
@api.get("/teachers")
async def list_teachers(user=Depends(get_current_user)):
    docs = await db.users.find({"role": {"$in": ["teacher", "admin"]}}, {"_id": 0, "password_hash": 0}).to_list(500)
    return docs


@api.post("/teachers")
async def create_teacher(payload: TeacherIn, user=Depends(require_role("admin"))):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(400, "Email già registrata")
    pwd = payload.password or "Cambiami2026!"
    doc = {
        "id": gen_id(),
        "email": email,
        "first_name": payload.first_name,
        "last_name": payload.last_name,
        "name": f"{payload.first_name} {payload.last_name}",
        "phone": payload.phone,
        "notes": payload.notes,
        "role": payload.role,
        "status": "active",
        "password_hash": hash_password(pwd),
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    return clean_doc(dict(doc))


@api.patch("/teachers/{tid}")
async def update_teacher(tid: str, payload: TeacherIn, user=Depends(require_role("admin"))):
    update = payload.model_dump(exclude={"password"})
    update["email"] = update["email"].lower().strip()
    update["name"] = f"{payload.first_name} {payload.last_name}"
    if payload.password:
        update["password_hash"] = hash_password(payload.password)
    await db.users.update_one({"id": tid}, {"$set": update})
    return clean_doc(await db.users.find_one({"id": tid}, {"_id": 0, "password_hash": 0}))


@api.delete("/teachers/{tid}")
async def delete_teacher(tid: str, user=Depends(require_role("admin"))):
    if tid == user["id"]:
        raise HTTPException(400, "Non puoi eliminare te stesso")
    await db.users.delete_one({"id": tid})
    return {"ok": True}


# ----------------------------- PARENTS -----------------------------
@api.get("/parents")
async def list_parents(user=Depends(get_current_user)):
    docs = await db.users.find({"role": "parent"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    for d in docs:
        links = await db.parent_links.find({"parent_id": d["id"]}, {"_id": 0}).to_list(50)
        d["student_ids"] = [l["student_id"] for l in links]
    return docs


@api.post("/parents")
async def create_parent(payload: ParentIn, user=Depends(require_role("admin", "teacher"))):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(400, "Email già registrata")
    parent_id = gen_id()
    doc = {
        "id": parent_id,
        "email": email,
        "first_name": payload.first_name,
        "last_name": payload.last_name,
        "name": f"{payload.first_name} {payload.last_name}",
        "phone": payload.phone,
        "notes": payload.notes,
        "role": "parent",
        "status": "pending",  # will become active when password is set
        "password_hash": None,
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)

    # link children
    for sid in payload.student_ids:
        await db.parent_links.insert_one({"id": gen_id(), "parent_id": parent_id, "student_id": sid, "created_at": now_iso()})

    # generate invite token (mock email)
    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({
        "token": token,
        "user_id": parent_id,
        "created_at": now_iso(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "used": False,
        "purpose": "invite",
    })
    invite_link = f"{os.environ.get('FRONTEND_URL', '')}/setup-password/{token}"
    logger.info(f"[MOCK EMAIL] Invite link for parent {email}: {invite_link}")

    return {
        "parent": clean_doc(dict(doc)),
        "mock_invite_link": invite_link,
        "mock_invite_token": token,
    }


@api.patch("/parents/{pid}")
async def update_parent(pid: str, payload: ParentIn, user=Depends(require_role("admin", "teacher"))):
    await db.users.update_one({"id": pid}, {"$set": {
        "first_name": payload.first_name,
        "last_name": payload.last_name,
        "name": f"{payload.first_name} {payload.last_name}",
        "phone": payload.phone,
        "notes": payload.notes,
        "email": payload.email.lower().strip(),
    }})
    # update links: replace
    await db.parent_links.delete_many({"parent_id": pid})
    for sid in payload.student_ids:
        await db.parent_links.insert_one({"id": gen_id(), "parent_id": pid, "student_id": sid, "created_at": now_iso()})
    return {"ok": True}


@api.delete("/parents/{pid}")
async def delete_parent(pid: str, user=Depends(require_role("admin"))):
    await db.users.delete_one({"id": pid})
    await db.parent_links.delete_many({"parent_id": pid})
    return {"ok": True}


@api.post("/parents/{pid}/resend-invite")
async def resend_invite(pid: str, user=Depends(require_role("admin", "teacher"))):
    p = await db.users.find_one({"id": pid})
    if not p:
        raise HTTPException(404, "Genitore non trovato")
    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({
        "token": token,
        "user_id": pid,
        "created_at": now_iso(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "used": False,
        "purpose": "invite",
    })
    invite_link = f"{os.environ.get('FRONTEND_URL', '')}/setup-password/{token}"
    logger.info(f"[MOCK EMAIL] Resent invite link for {p['email']}: {invite_link}")
    return {"mock_invite_link": invite_link, "mock_invite_token": token}


# ----------------------------- DAILY ACTIVITIES -----------------------------
@api.get("/activities")
async def list_activities(student_id: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None, classroom_id: Optional[str] = None, school_year_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if student_id:
        q["student_id"] = student_id
    if date_from or date_to:
        q["date"] = {}
        if date_from:
            q["date"]["$gte"] = date_from
        if date_to:
            q["date"]["$lte"] = date_to
    if classroom_id and school_year_id:
        # get students in classroom for that year
        enrolls = await db.enrollments.find({"classroom_id": classroom_id, "school_year_id": school_year_id}, {"_id": 0}).to_list(500)
        ids = [e["student_id"] for e in enrolls]
        q["student_id"] = {"$in": ids}
    docs = await db.activities.find(q, {"_id": 0}).sort("date", -1).to_list(1000)
    return docs


@api.post("/activities")
async def upsert_activity(payload: ActivityIn, user=Depends(require_role("admin", "teacher"))):
    existing = await db.activities.find_one({"student_id": payload.student_id, "date": payload.date})
    data = payload.model_dump()
    if existing:
        await db.activities.update_one({"id": existing["id"]}, {"$set": {**data, "updated_at": now_iso(), "updated_by": user["id"]}})
        return await db.activities.find_one({"id": existing["id"]}, {"_id": 0})
    data["id"] = gen_id()
    data["created_at"] = now_iso()
    data["created_by"] = user["id"]
    await db.activities.insert_one(data)
    return clean_doc(data)


@api.delete("/activities/{aid}")
async def delete_activity(aid: str, user=Depends(require_role("admin", "teacher"))):
    await db.activities.delete_one({"id": aid})
    return {"ok": True}


# --- ACTIVITY AUTO-FILL: from piano didattico / menu / extra labs ---
DAYS_IT_LOWER = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"]
DAYS_IT_CAP = ["Lunedi", "Martedi", "Mercoledi", "Giovedi", "Venerdi"]


def _compute_week_for_date(valid_from_iso: str, target_iso: str) -> int:
    try:
        start = datetime.fromisoformat(valid_from_iso).date()
        target = datetime.fromisoformat(target_iso).date()
    except Exception:
        return 1
    start_mon = start - timedelta(days=start.weekday())
    target_mon = target - timedelta(days=target.weekday())
    delta_weeks = (target_mon - start_mon).days // 7
    return (delta_weeks % 4) + 1


def _strip_html(s: str) -> str:
    import re
    return re.sub(r"<[^>]+>", " ", s or "").replace("&nbsp;", " ").strip()


@api.get("/activities/suggestions")
async def activity_suggestions(
    student_id: str,
    date_str: str,
    user=Depends(require_role("admin", "teacher")),
):
    """Auto-fill suggestions per la scheda nuova (come nel Flask originale):
    - note_pranzo: dal menu rotante del giorno
    - note_didattica: dai piani didattici attivi della classe
    - note_motoria: dal laboratorio extra del giorno della settimana
    """
    active = await db.school_years.find_one({"is_active": True}, {"_id": 0})
    classroom_id = None
    if active:
        enr = await db.enrollments.find_one({"student_id": student_id, "school_year_id": active["id"]}, {"_id": 0})
        if enr:
            classroom_id = enr.get("classroom_id")

    out = {"note_pranzo": "", "note_didattica": "", "note_motoria": "", "sources": {}}

    # Menu del giorno
    menu = await db.menus.find_one(
        {"valid_from": {"$lte": date_str}, "valid_to": {"$gte": date_str}},
        {"_id": 0},
    )
    if menu:
        try:
            d_obj = datetime.fromisoformat(date_str).date()
        except Exception:
            d_obj = date.today()
        if d_obj.weekday() < 5:  # only Mon-Fri
            week = _compute_week_for_date(menu["valid_from"], date_str)
            day_cap = DAYS_IT_CAP[d_obj.weekday()]
            meal = await db.menu_meals.find_one(
                {"menu_id": menu["id"], "week": week, "day": day_cap},
                {"_id": 0},
            )
            if meal:
                parts = [meal.get("primo", ""), meal.get("secondo", ""), meal.get("contorno", ""), meal.get("frutta", "")]
                parts = [p for p in parts if p]
                if parts:
                    out["note_pranzo"] = " - ".join(parts)
                    out["sources"]["pranzo"] = {"week": week, "day": day_cap}

    if classroom_id:
        # Piani didattici attivi per la data
        plans = await db.lesson_plans.find(
            {"classroom_id": classroom_id, "date_from": {"$lte": date_str}, "date_to": {"$gte": date_str}},
            {"_id": 0},
        ).to_list(20)
        if plans:
            texts = [_strip_html(p.get("body", "")) for p in plans]
            texts = [t for t in texts if t]
            if texts:
                out["note_didattica"] = "\n\n".join(texts)
                out["sources"]["didattica"] = [p["id"] for p in plans]

        # Laboratorio extra del giorno
        try:
            d_obj = datetime.fromisoformat(date_str).date()
        except Exception:
            d_obj = date.today()
        if d_obj.weekday() < 5:
            day_lower = DAYS_IT_LOWER[d_obj.weekday()]
            lab = await db.extra_labs.find_one(
                {"classroom_id": classroom_id, "day_of_week": day_lower},
                {"_id": 0},
            )
            if lab:
                txt = lab.get("title", "")
                if lab.get("teacher_name"):
                    txt += f" con {lab['teacher_name']}"
                out["note_motoria"] = txt
                out["sources"]["motoria"] = lab["id"]

    return out


@api.get("/activities/replicate-from")
async def replicate_from(
    student_id: str,
    from_date: str,
    user=Depends(require_role("admin", "teacher")),
):
    """Restituisce i campi di una scheda precedente da replicare."""
    src = await db.activities.find_one({"student_id": student_id, "date": from_date}, {"_id": 0})
    if not src:
        raise HTTPException(404, "Nessuna scheda da replicare in quella data")
    keep = ["didattica", "note_didattica", "motoria", "note_motoria",
            "pranzo", "note_pranzo", "merenda", "riposo", "cacca", "pipi", "note"]
    return {k: src.get(k, "") for k in keep}


@api.get("/activities/last-before")
async def last_before(
    student_id: str,
    before_date: str,
    user=Depends(require_role("admin", "teacher")),
):
    """Restituisce l'ultima scheda registrata PRIMA di una certa data."""
    src = await db.activities.find_one(
        {"student_id": student_id, "date": {"$lt": before_date}},
        {"_id": 0},
        sort=[("date", -1)],
    )
    if not src:
        raise HTTPException(404, "Nessuna scheda precedente trovata")
    keep = ["didattica", "note_didattica", "motoria", "note_motoria",
            "pranzo", "note_pranzo", "merenda", "riposo", "cacca", "pipi", "note"]
    out = {k: src.get(k, "") for k in keep}
    out["source_date"] = src["date"]
    return out


@api.post("/activities/bulk")
async def bulk_apply_activity(payload: BulkActivityIn, user=Depends(require_role("admin", "teacher"))):
    """Applica la stessa scheda a TUTTI gli alunni della sezione per la data data.
    Se overwrite_existing è False, gli alunni che hanno già una scheda quel giorno vengono saltati.
    Restituisce {applied, skipped, students_modified}.
    """
    enrolls = await db.enrollments.find(
        {"classroom_id": payload.classroom_id, "school_year_id": payload.school_year_id},
        {"_id": 0},
    ).to_list(500)
    student_ids = [e["student_id"] for e in enrolls]
    if payload.only_student_ids is not None:
        student_ids = [sid for sid in student_ids if sid in payload.only_student_ids]

    activity_fields = {
        "didattica": payload.didattica,
        "note_didattica": payload.note_didattica,
        "motoria": payload.motoria,
        "note_motoria": payload.note_motoria,
        "pranzo": payload.pranzo,
        "note_pranzo": payload.note_pranzo,
        "merenda": payload.merenda,
        "riposo": payload.riposo,
        "cacca": payload.cacca,
        "pipi": payload.pipi,
        "note": payload.note,
    }

    applied = 0
    skipped = 0
    modified_ids = []
    for sid in student_ids:
        existing = await db.activities.find_one({"student_id": sid, "date": payload.date})
        if existing and not payload.overwrite_existing:
            skipped += 1
            continue
        data = {**activity_fields}
        if existing:
            await db.activities.update_one(
                {"id": existing["id"]},
                {"$set": {**data, "updated_at": now_iso(), "updated_by": user["id"]}},
            )
        else:
            await db.activities.insert_one({
                **data,
                "id": gen_id(),
                "student_id": sid,
                "date": payload.date,
                "created_at": now_iso(),
                "created_by": user["id"],
            })
        applied += 1
        modified_ids.append(sid)
    return {"applied": applied, "skipped": skipped, "students_modified": modified_ids}


# ----------------------------- MENU (rotating 4-week) -----------------------------
DAYS_IT = ["Lunedi", "Martedi", "Mercoledi", "Giovedi", "Venerdi"]


@api.get("/menus")
async def list_menus(user=Depends(get_current_user)):
    docs = await db.menus.find({}, {"_id": 0}).sort("valid_from", -1).to_list(200)
    for d in docs:
        d["meal_count"] = await db.menu_meals.count_documents({"menu_id": d["id"]})
    return docs


@api.post("/menus")
async def create_menu(payload: MenuIn, user=Depends(require_role("admin", "teacher"))):
    doc = payload.model_dump()
    doc["id"] = gen_id()
    doc["created_at"] = now_iso()
    if not doc.get("school_year_id"):
        active = await db.school_years.find_one({"is_active": True}, {"_id": 0})
        if active:
            doc["school_year_id"] = active["id"]
    await db.menus.insert_one(doc)
    # Pre-create empty grid (4 weeks × 5 days)
    grid = []
    for w in [1, 2, 3, 4]:
        for d in DAYS_IT:
            grid.append({
                "id": gen_id(), "menu_id": doc["id"], "week": w, "day": d,
                "primo": "", "secondo": "", "contorno": "", "frutta": "",
            })
    if grid:
        await db.menu_meals.insert_many(grid)
    return clean_doc(doc)


@api.patch("/menus/{mid}")
async def update_menu(mid: str, payload: MenuIn, user=Depends(require_role("admin", "teacher"))):
    await db.menus.update_one({"id": mid}, {"$set": payload.model_dump()})
    return await db.menus.find_one({"id": mid}, {"_id": 0})


@api.delete("/menus/{mid}")
async def delete_menu(mid: str, user=Depends(require_role("admin"))):
    await db.menus.delete_one({"id": mid})
    await db.menu_meals.delete_many({"menu_id": mid})
    return {"ok": True}


@api.get("/menus/{mid}/meals")
async def get_meals(mid: str, user=Depends(get_current_user)):
    """Return the 4×5 grid (filling missing cells)."""
    docs = await db.menu_meals.find({"menu_id": mid}, {"_id": 0}).to_list(200)
    by_key = {(d["week"], d["day"]): d for d in docs}
    out = []
    for w in [1, 2, 3, 4]:
        for d in DAYS_IT:
            existing = by_key.get((w, d))
            if existing:
                out.append(existing)
            else:
                out.append({"id": None, "menu_id": mid, "week": w, "day": d, "primo": "", "secondo": "", "contorno": "", "frutta": ""})
    return out


@api.put("/menus/{mid}/meals")
async def replace_meals(mid: str, payload: MealsBulkIn, user=Depends(require_role("admin", "teacher"))):
    # Idempotent upsert per (menu_id, week, day)
    for m in payload.meals:
        await db.menu_meals.update_one(
            {"menu_id": mid, "week": m.week, "day": m.day},
            {"$set": {
                "id": gen_id(),
                "menu_id": mid,
                "week": m.week,
                "day": m.day,
                "primo": m.primo,
                "secondo": m.secondo,
                "contorno": m.contorno,
                "frutta": m.frutta,
                "updated_at": now_iso(),
            }},
            upsert=True,
        )
    return {"ok": True, "saved": len(payload.meals)}


def compute_current_week(valid_from: str) -> int:
    """Return rotating week number 1..4 based on weeks elapsed since valid_from."""
    try:
        start = datetime.fromisoformat(valid_from).date()
    except Exception:
        return 1
    today = date.today()
    # Align to ISO Monday of start week
    start_mon = start - timedelta(days=start.weekday())
    today_mon = today - timedelta(days=today.weekday())
    delta_weeks = (today_mon - start_mon).days // 7
    return (delta_weeks % 4) + 1


@api.get("/menus/current")
async def current_menu(user=Depends(get_current_user)):
    today = date.today().isoformat()
    menu = await db.menus.find_one({"valid_from": {"$lte": today}, "valid_to": {"$gte": today}}, {"_id": 0})
    if not menu:
        return None
    week = compute_current_week(menu["valid_from"])
    meals = await db.menu_meals.find({"menu_id": menu["id"], "week": week}, {"_id": 0}).to_list(20)
    # Sort by DAYS_IT order
    order = {d: i for i, d in enumerate(DAYS_IT)}
    meals.sort(key=lambda m: order.get(m["day"], 99))
    return {"menu": menu, "current_week": week, "meals": meals}


# ----------------------------- NEWS -----------------------------
@api.get("/news")
async def list_news(classroom_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if classroom_id:
        q["$or"] = [{"classroom_id": classroom_id}, {"classroom_id": None}]
    docs = await db.news.find(q, {"_id": 0}).sort("publish_date", -1).to_list(500)
    return docs


@api.post("/news")
async def create_news(payload: NewsIn, user=Depends(require_role("admin", "teacher"))):
    doc = payload.model_dump()
    doc["id"] = gen_id()
    doc["publish_date"] = doc.get("publish_date") or now_iso()
    doc["created_at"] = now_iso()
    doc["author_name"] = user.get("name", "")
    await db.news.insert_one(doc)
    return clean_doc(doc)


@api.patch("/news/{nid}")
async def update_news(nid: str, payload: NewsIn, user=Depends(require_role("admin", "teacher"))):
    await db.news.update_one({"id": nid}, {"$set": payload.model_dump()})
    return await db.news.find_one({"id": nid}, {"_id": 0})


@api.delete("/news/{nid}")
async def delete_news(nid: str, user=Depends(require_role("admin", "teacher"))):
    await db.news.delete_one({"id": nid})
    return {"ok": True}


# ----------------------------- DASHBOARD -----------------------------
@api.get("/dashboard/stats")
async def dashboard_stats(user=Depends(require_role("admin", "teacher"))):
    active_year = await db.school_years.find_one({"is_active": True}, {"_id": 0})
    total_students = await db.students.count_documents({})
    total_parents = await db.users.count_documents({"role": "parent"})
    total_teachers = await db.users.count_documents({"role": {"$in": ["teacher", "admin"]}})
    total_classes = await db.classrooms.count_documents({"school_year_id": active_year["id"]} if active_year else {})
    today = date.today().isoformat()
    today_activities = await db.activities.count_documents({"date": today})
    pending_parents = await db.users.count_documents({"role": "parent", "status": "pending"})
    return {
        "active_year": active_year,
        "total_students": total_students,
        "total_parents": total_parents,
        "total_teachers": total_teachers,
        "total_classes": total_classes,
        "today_activities": today_activities,
        "pending_parents": pending_parents,
    }


# ----------------------------- PARENT-FACING -----------------------------
@api.get("/parent/me/children")
async def my_children(user=Depends(require_role("parent"))):
    links = await db.parent_links.find({"parent_id": user["id"]}, {"_id": 0}).to_list(20)
    out = []
    active_year = await db.school_years.find_one({"is_active": True}, {"_id": 0})
    for l in links:
        s = await db.students.find_one({"id": l["student_id"]}, {"_id": 0})
        if not s:
            continue
        if active_year:
            e = await db.enrollments.find_one({"student_id": s["id"], "school_year_id": active_year["id"]}, {"_id": 0})
            if e:
                c = await db.classrooms.find_one({"id": e["classroom_id"]}, {"_id": 0})
                s["classroom"] = c
        out.append(s)
    return out


@api.get("/parent/child/{sid}/day")
async def child_day(sid: str, date_str: Optional[str] = None, user=Depends(require_role("parent"))):
    # security: ensure parent owns this child
    link = await db.parent_links.find_one({"parent_id": user["id"], "student_id": sid})
    if not link:
        raise HTTPException(403, "Non autorizzato")
    d = date_str or date.today().isoformat()
    activity = await db.activities.find_one({"student_id": sid, "date": d}, {"_id": 0})
    return {"date": d, "activity": activity}


@api.get("/parent/child/{sid}/timeline")
async def child_timeline(sid: str, days: int = 14, user=Depends(require_role("parent"))):
    link = await db.parent_links.find_one({"parent_id": user["id"], "student_id": sid})
    if not link:
        raise HTTPException(403, "Non autorizzato")
    since = (date.today() - timedelta(days=days)).isoformat()
    docs = await db.activities.find({"student_id": sid, "date": {"$gte": since}}, {"_id": 0}).sort("date", -1).to_list(60)
    return docs


# ----------------------------- AI DAILY REPORT -----------------------------
@api.get("/ai/daily-report/{sid}")
async def ai_daily_report(sid: str, date_str: Optional[str] = None, user=Depends(get_current_user)):
    # Permissions: parent must own child, teacher/admin OK
    if user["role"] == "parent":
        link = await db.parent_links.find_one({"parent_id": user["id"], "student_id": sid})
        if not link:
            raise HTTPException(403, "Non autorizzato")
    d = date_str or date.today().isoformat()

    student = await db.students.find_one({"id": sid}, {"_id": 0})
    if not student:
        raise HTTPException(404, "Alunno non trovato")
    activity = await db.activities.find_one({"student_id": sid, "date": d}, {"_id": 0})
    if not activity:
        return {"date": d, "report": None, "message": "Nessuna attività registrata per questa data."}

    # Cache: if we have a report already, return it
    cached = await db.ai_reports.find_one({"student_id": sid, "date": d}, {"_id": 0})
    if cached and not cached.get("stale"):
        return {"date": d, "report": cached["text"], "cached": True}

    # Build prompt
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    bambino = student.get("first_name", "il/la bambino/a")
    parts = []
    if activity.get("didattica"):
        parts.append(f"Attività didattiche: {activity['didattica']}. Note: {activity.get('note_didattica', '') or '—'}")
    if activity.get("motoria"):
        parts.append(f"Attività motoria: {activity['motoria']}. Note: {activity.get('note_motoria', '') or '—'}")
    if activity.get("merenda"):
        parts.append(f"Merenda: {activity['merenda']}")
    if activity.get("pranzo"):
        parts.append(f"Pranzo: {activity['pranzo']}. Note: {activity.get('note_pranzo', '') or '—'}")
    if activity.get("riposo"):
        parts.append(f"Riposo: {activity['riposo']}")
    if activity.get("cacca"):
        parts.append(f"Cacca: {activity['cacca']}")
    if activity.get("pipi"):
        parts.append(f"Pipì: {activity['pipi']}")
    if activity.get("note"):
        parts.append(f"Note delle maestre: {activity['note']}")

    facts = "\n- ".join(parts) if parts else "Giornata serena, nessuna nota particolare."

    system_msg = (
        "Sei un'assistente che scrive brevi resoconti giornalieri ai genitori di bambini "
        "della scuola dell'infanzia. Scrivi in italiano, con tono caldo, naturale e rassicurante, "
        "in 4-6 frasi. Non inventare dettagli, usa solo i fatti forniti. Rivolgi il messaggio "
        "direttamente al genitore (\"oggi tuo/a figlio/a...\"). Non usare emoji."
    )
    user_msg = (
        f"Bambino/a: {bambino}\n"
        f"Data: {d}\n\n"
        f"Fatti della giornata:\n- {facts}\n\n"
        "Scrivi il resoconto."
    )
    try:
        chat = LlmChat(
            api_key=os.environ["EMERGENT_LLM_KEY"],
            session_id=f"report-{sid}-{d}",
            system_message=system_msg,
        ).with_model("openai", "gpt-5.2")
        response = await chat.send_message(UserMessage(text=user_msg))
        text = response if isinstance(response, str) else str(response)
    except Exception as ex:
        logger.exception("AI error")
        # Fallback summary
        text = (
            f"Oggi {bambino} ha trascorso una bella giornata all'asilo. "
            + " ".join(parts[:4])
            + " Le maestre lo/la salutano con affetto."
        )

    await db.ai_reports.update_one(
        {"student_id": sid, "date": d},
        {"$set": {"id": gen_id(), "student_id": sid, "date": d, "text": text, "generated_at": now_iso(), "stale": False}},
        upsert=True,
    )
    return {"date": d, "report": text, "cached": False}


@api.post("/ai/daily-report/{sid}/refresh")
async def refresh_report(sid: str, date_str: Optional[str] = None, user=Depends(require_role("admin", "teacher", "parent"))):
    d = date_str or date.today().isoformat()
    await db.ai_reports.update_one({"student_id": sid, "date": d}, {"$set": {"stale": True}}, upsert=False)
    return await ai_daily_report(sid, d, user)


# ============================================================
# NEW: STEP 1h — Lesson Plans, Communications, Events, Extra Labs,
# School Profile, Media (foto), Attendance (barcode check-in/out)
# ============================================================

# --- Models ---
class LessonPlanIn(BaseModel):
    classroom_id: str
    school_year_id: Optional[str] = None
    date_from: str  # YYYY-MM-DD
    date_to: str
    title: str
    body: str  # html allowed


class CommunicationIn(BaseModel):
    title: str
    body: str
    type: Literal["comunicazione_classe", "evento_attivita", "avviso"] = "comunicazione_classe"
    classroom_id: Optional[str] = None  # None = tutta la scuola
    publish_date: Optional[str] = None
    media_ids: List[str] = []


class CalendarEventIn(BaseModel):
    name: str
    date: str  # YYYY-MM-DD
    end_date: Optional[str] = None
    notes: Optional[str] = ""
    category: Literal["festivita", "chiusura", "gita", "festa", "riunione", "altro"] = "altro"


class ExtraLabIn(BaseModel):
    classroom_id: str
    day_of_week: Literal["lunedì", "martedì", "mercoledì", "giovedì", "venerdì"]
    title: str  # es. "Musicoterapia"
    teacher_name: Optional[str] = ""


class SchoolProfileIn(BaseModel):
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    mobile: Optional[str] = ""
    whatsapp: Optional[str] = ""
    address: Optional[str] = ""
    vat: Optional[str] = ""
    website: Optional[str] = ""
    facebook: Optional[str] = ""
    instagram: Optional[str] = ""
    logo_base64: Optional[str] = ""  # data URL


class MediaIn(BaseModel):
    filename: str
    content_type: str
    data_base64: str  # data URL (e.g., "data:image/jpeg;base64,...")
    caption: Optional[str] = ""
    classroom_id: Optional[str] = None
    student_id: Optional[str] = None
    communication_id: Optional[str] = None


class AttendanceCheckIn(BaseModel):
    student_id: Optional[str] = None
    barcode: Optional[str] = None
    action: Literal["in", "out"] = "in"
    note: Optional[str] = ""


class BarcodeGenIn(BaseModel):
    student_id: str
    code: Optional[str] = None  # if not provided, auto-generate


# --- LESSON PLANS ---
@api.get("/lesson-plans")
async def list_lesson_plans(
    classroom_id: Optional[str] = None,
    school_year_id: Optional[str] = None,
    user=Depends(require_role("admin", "teacher")),
):
    q = {}
    if classroom_id:
        q["classroom_id"] = classroom_id
    if school_year_id:
        q["school_year_id"] = school_year_id
    docs = await db.lesson_plans.find(q, {"_id": 0}).sort("date_from", -1).to_list(500)
    return docs


@api.post("/lesson-plans")
async def create_lesson_plan(payload: LessonPlanIn, user=Depends(require_role("admin", "teacher"))):
    doc = payload.model_dump()
    doc["id"] = gen_id()
    doc["created_at"] = now_iso()
    doc["created_by"] = user["id"]
    if not doc.get("school_year_id"):
        active = await db.school_years.find_one({"is_active": True}, {"_id": 0})
        if active:
            doc["school_year_id"] = active["id"]
    await db.lesson_plans.insert_one(doc)
    return clean_doc(doc)


@api.patch("/lesson-plans/{pid}")
async def update_lesson_plan(pid: str, payload: LessonPlanIn, user=Depends(require_role("admin", "teacher"))):
    await db.lesson_plans.update_one({"id": pid}, {"$set": payload.model_dump()})
    return await db.lesson_plans.find_one({"id": pid}, {"_id": 0})


@api.delete("/lesson-plans/{pid}")
async def delete_lesson_plan(pid: str, user=Depends(require_role("admin", "teacher"))):
    await db.lesson_plans.delete_one({"id": pid})
    return {"ok": True}


# --- COMMUNICATIONS (rich news) ---
@api.get("/communications")
async def list_communications(classroom_id: Optional[str] = None, user=Depends(require_role("admin", "teacher"))):
    q = {}
    if classroom_id:
        q["$or"] = [{"classroom_id": classroom_id}, {"classroom_id": None}]
    docs = await db.communications.find(q, {"_id": 0}).sort("publish_date", -1).to_list(500)
    # enrich with media
    for d in docs:
        if d.get("media_ids"):
            media = await db.media.find({"id": {"$in": d["media_ids"]}}, {"_id": 0, "data_base64": 0}).to_list(50)
            d["media"] = media
        else:
            d["media"] = []
    return docs


@api.post("/communications")
async def create_communication(payload: CommunicationIn, user=Depends(require_role("admin", "teacher"))):
    doc = payload.model_dump()
    doc["id"] = gen_id()
    doc["publish_date"] = doc.get("publish_date") or now_iso()
    doc["created_at"] = now_iso()
    doc["author_name"] = user.get("name", "")
    await db.communications.insert_one(doc)
    return clean_doc(doc)


@api.patch("/communications/{cid}")
async def update_communication(cid: str, payload: CommunicationIn, user=Depends(require_role("admin", "teacher"))):
    await db.communications.update_one({"id": cid}, {"$set": payload.model_dump()})
    return await db.communications.find_one({"id": cid}, {"_id": 0})


@api.delete("/communications/{cid}")
async def delete_communication(cid: str, user=Depends(require_role("admin", "teacher"))):
    await db.communications.delete_one({"id": cid})
    return {"ok": True}


# --- CALENDAR EVENTS ---
@api.get("/calendar-events")
async def list_events(date_from: Optional[str] = None, date_to: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if date_from or date_to:
        q["date"] = {}
        if date_from:
            q["date"]["$gte"] = date_from
        if date_to:
            q["date"]["$lte"] = date_to
    docs = await db.calendar_events.find(q, {"_id": 0}).sort("date", 1).to_list(500)
    return docs


@api.post("/calendar-events")
async def create_event(payload: CalendarEventIn, user=Depends(require_role("admin", "teacher"))):
    doc = payload.model_dump()
    doc["id"] = gen_id()
    doc["created_at"] = now_iso()
    await db.calendar_events.insert_one(doc)
    return clean_doc(doc)


@api.patch("/calendar-events/{eid}")
async def update_event(eid: str, payload: CalendarEventIn, user=Depends(require_role("admin", "teacher"))):
    await db.calendar_events.update_one({"id": eid}, {"$set": payload.model_dump()})
    return await db.calendar_events.find_one({"id": eid}, {"_id": 0})


@api.delete("/calendar-events/{eid}")
async def delete_event(eid: str, user=Depends(require_role("admin"))):
    await db.calendar_events.delete_one({"id": eid})
    return {"ok": True}


# --- EXTRA LABS (palinsesto laboratori) ---
@api.get("/extra-labs")
async def list_extra_labs(classroom_id: Optional[str] = None, user=Depends(require_role("admin", "teacher"))):
    q = {}
    if classroom_id:
        q["classroom_id"] = classroom_id
    docs = await db.extra_labs.find(q, {"_id": 0}).to_list(500)
    return docs


@api.post("/extra-labs")
async def create_extra_lab(payload: ExtraLabIn, user=Depends(require_role("admin", "teacher"))):
    doc = payload.model_dump()
    doc["id"] = gen_id()
    doc["created_at"] = now_iso()
    await db.extra_labs.insert_one(doc)
    return clean_doc(doc)


@api.patch("/extra-labs/{lid}")
async def update_extra_lab(lid: str, payload: ExtraLabIn, user=Depends(require_role("admin", "teacher"))):
    await db.extra_labs.update_one({"id": lid}, {"$set": payload.model_dump()})
    return await db.extra_labs.find_one({"id": lid}, {"_id": 0})


@api.delete("/extra-labs/{lid}")
async def delete_extra_lab(lid: str, user=Depends(require_role("admin", "teacher"))):
    await db.extra_labs.delete_one({"id": lid})
    return {"ok": True}


# --- SCHOOL PROFILE (single doc) ---
@api.get("/school-profile")
async def get_school_profile(user=Depends(get_current_user)):
    doc = await db.school_profile.find_one({"id": "main"}, {"_id": 0})
    return doc or {}


@api.put("/school-profile")
async def update_school_profile(payload: SchoolProfileIn, user=Depends(require_role("admin"))):
    data = payload.model_dump()
    data["id"] = "main"
    data["updated_at"] = now_iso()
    await db.school_profile.update_one({"id": "main"}, {"$set": data}, upsert=True)
    return data


# --- MEDIA (foto / file) ---
@api.get("/media")
async def list_media(
    classroom_id: Optional[str] = None,
    student_id: Optional[str] = None,
    communication_id: Optional[str] = None,
    user=Depends(get_current_user),
):
    q = {}
    if classroom_id:
        q["classroom_id"] = classroom_id
    if student_id:
        q["student_id"] = student_id
    if communication_id:
        q["communication_id"] = communication_id
    # Parent: only see media of their children's classrooms
    if user["role"] == "parent":
        links = await db.parent_links.find({"parent_id": user["id"]}, {"_id": 0}).to_list(20)
        active = await db.school_years.find_one({"is_active": True}, {"_id": 0})
        if not active:
            return []
        child_ids = [l["student_id"] for l in links]
        enrolls = await db.enrollments.find({"student_id": {"$in": child_ids}, "school_year_id": active["id"]}, {"_id": 0}).to_list(50)
        class_ids = list({e["classroom_id"] for e in enrolls})
        q["$or"] = [
            {"classroom_id": {"$in": class_ids}},
            {"student_id": {"$in": child_ids}},
        ]
    # Exclude heavy base64 from list
    docs = await db.media.find(q, {"_id": 0, "data_base64": 0}).sort("created_at", -1).to_list(500)
    return docs


@api.get("/media/{mid}")
async def get_media(mid: str, user=Depends(get_current_user)):
    doc = await db.media.find_one({"id": mid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Media non trovato")
    return doc


@api.post("/media")
async def upload_media(payload: MediaIn, user=Depends(require_role("admin", "teacher"))):
    doc = payload.model_dump()
    doc["id"] = gen_id()
    doc["created_at"] = now_iso()
    doc["uploaded_by"] = user["id"]
    await db.media.insert_one(doc)
    return clean_doc(doc)


@api.delete("/media/{mid}")
async def delete_media(mid: str, user=Depends(require_role("admin", "teacher"))):
    await db.media.delete_one({"id": mid})
    return {"ok": True}


# --- ATTENDANCE & BARCODE ---
@api.post("/barcodes")
async def generate_barcode(payload: BarcodeGenIn, user=Depends(require_role("admin", "teacher"))):
    s = await db.students.find_one({"id": payload.student_id})
    if not s:
        raise HTTPException(404, "Alunno non trovato")
    code = payload.code or datetime.now(timezone.utc).strftime("%y%m%d%H%M%S")
    # Ensure uniqueness
    if await db.barcodes.find_one({"code": code}):
        code = f"{code}{secrets.token_hex(2)}"
    await db.barcodes.update_one(
        {"student_id": payload.student_id},
        {"$set": {"id": gen_id(), "student_id": payload.student_id, "code": code, "created_at": now_iso()}},
        upsert=True,
    )
    return {"student_id": payload.student_id, "code": code}


@api.get("/barcodes")
async def list_barcodes(user=Depends(require_role("admin", "teacher"))):
    docs = await db.barcodes.find({}, {"_id": 0}).to_list(1000)
    return docs


@api.post("/attendance")
async def attendance_check(payload: AttendanceCheckIn, user=Depends(require_role("admin", "teacher"))):
    student = None
    if payload.barcode:
        b = await db.barcodes.find_one({"code": payload.barcode})
        if not b:
            raise HTTPException(404, "Barcode non trovato")
        student = await db.students.find_one({"id": b["student_id"]}, {"_id": 0})
    elif payload.student_id:
        student = await db.students.find_one({"id": payload.student_id}, {"_id": 0})
    if not student:
        raise HTTPException(404, "Alunno non trovato")

    now = datetime.now(timezone.utc)
    doc = {
        "id": gen_id(),
        "student_id": student["id"],
        "action": payload.action,
        "ts": now.isoformat(),
        "date": now.date().isoformat(),
        "note": payload.note,
        "by_user_id": user["id"],
    }
    await db.attendance.insert_one(doc)
    return {"ok": True, "student": clean_doc(student), "entry": clean_doc(doc), "ts_local": now.isoformat()}


@api.get("/attendance")
async def list_attendance(
    date_str: Optional[str] = None,
    student_id: Optional[str] = None,
    classroom_id: Optional[str] = None,
    school_year_id: Optional[str] = None,
    user=Depends(get_current_user),
):
    q = {}
    if date_str:
        q["date"] = date_str
    if student_id:
        q["student_id"] = student_id
    if classroom_id and school_year_id:
        enrolls = await db.enrollments.find({"classroom_id": classroom_id, "school_year_id": school_year_id}, {"_id": 0}).to_list(500)
        ids = [e["student_id"] for e in enrolls]
        q["student_id"] = {"$in": ids}
    docs = await db.attendance.find(q, {"_id": 0}).sort("ts", -1).to_list(2000)
    return docs


# --- PARENT-FACING for new entities ---
@api.get("/parent/me/lesson-plans")
async def parent_lesson_plans(user=Depends(require_role("parent"))):
    links = await db.parent_links.find({"parent_id": user["id"]}, {"_id": 0}).to_list(20)
    active = await db.school_years.find_one({"is_active": True}, {"_id": 0})
    if not active or not links:
        return []
    child_ids = [l["student_id"] for l in links]
    enrolls = await db.enrollments.find({"student_id": {"$in": child_ids}, "school_year_id": active["id"]}, {"_id": 0}).to_list(50)
    class_ids = list({e["classroom_id"] for e in enrolls})
    docs = await db.lesson_plans.find({"classroom_id": {"$in": class_ids}}, {"_id": 0}).sort("date_from", -1).to_list(100)
    return docs


@api.get("/parent/me/communications")
async def parent_communications(user=Depends(require_role("parent"))):
    links = await db.parent_links.find({"parent_id": user["id"]}, {"_id": 0}).to_list(20)
    active = await db.school_years.find_one({"is_active": True}, {"_id": 0})
    child_ids = [l["student_id"] for l in links]
    enrolls = await db.enrollments.find({"student_id": {"$in": child_ids}, "school_year_id": active["id"]} if active else {"student_id": {"$in": child_ids}}, {"_id": 0}).to_list(50)
    class_ids = list({e["classroom_id"] for e in enrolls})
    docs = await db.communications.find({"$or": [{"classroom_id": None}, {"classroom_id": {"$in": class_ids}}]}, {"_id": 0}).sort("publish_date", -1).to_list(200)
    for d in docs:
        if d.get("media_ids"):
            media = await db.media.find({"id": {"$in": d["media_ids"]}}, {"_id": 0, "data_base64": 0}).to_list(50)
            d["media"] = media
        else:
            d["media"] = []
    return docs


@api.get("/parent/me/extra-labs")
async def parent_extra_labs(user=Depends(require_role("parent"))):
    links = await db.parent_links.find({"parent_id": user["id"]}, {"_id": 0}).to_list(20)
    active = await db.school_years.find_one({"is_active": True}, {"_id": 0})
    child_ids = [l["student_id"] for l in links]
    enrolls = await db.enrollments.find({"student_id": {"$in": child_ids}, "school_year_id": active["id"]} if active else {"student_id": {"$in": child_ids}}, {"_id": 0}).to_list(50)
    class_ids = list({e["classroom_id"] for e in enrolls})
    docs = await db.extra_labs.find({"classroom_id": {"$in": class_ids}}, {"_id": 0}).to_list(200)
    return docs


@api.get("/public/school-profile")
async def public_school_profile():
    """Public school profile (no auth) for landing/contact info"""
    doc = await db.school_profile.find_one({"id": "main"}, {"_id": 0})
    if not doc:
        return {}
    # Remove logo if very large or just return
    return doc




# ----------------------------- HEALTH -----------------------------
@api.get("/")
async def root():
    return {"app": "Scuola Infanzia", "status": "ok"}


# ----------------------------- SEED -----------------------------
async def seed():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.school_years.create_index("id", unique=True)
    await db.classrooms.create_index("id", unique=True)
    await db.students.create_index("id", unique=True)
    await db.enrollments.create_index([("student_id", 1), ("school_year_id", 1)])
    await db.parent_links.create_index([("parent_id", 1), ("student_id", 1)])
    await db.activities.create_index([("student_id", 1), ("date", 1)], unique=True)
    await db.ai_reports.create_index([("student_id", 1), ("date", 1)], unique=True)
    await db.password_reset_tokens.create_index("token", unique=True)
    await db.login_attempts.create_index("identifier", unique=True)

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@scuolapp.it")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin2026!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": gen_id(),
            "email": admin_email,
            "first_name": "Direzione",
            "last_name": "Scuola",
            "name": "Direzione Scuola",
            "role": "admin",
            "status": "active",
            "password_hash": hash_password(admin_password),
            "created_at": now_iso(),
        })
        logger.info(f"Admin seeded: {admin_email}")
    else:
        # idempotent: ensure password matches env (helpful in dev)
        if not verify_password(admin_password, existing["password_hash"]):
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password), "status": "active", "role": "admin"}})
            logger.info(f"Admin password synced for {admin_email}")

    # Seed demo data only if no school years
    if await db.school_years.count_documents({}) == 0:
        year_id = gen_id()
        await db.school_years.insert_one({
            "id": year_id,
            "label": "2025/2026",
            "start_date": "2025-09-15",
            "end_date": "2026-06-30",
            "is_active": True,
            "created_at": now_iso(),
        })
        prev_year_id = gen_id()
        await db.school_years.insert_one({
            "id": prev_year_id,
            "label": "2024/2025",
            "start_date": "2024-09-15",
            "end_date": "2025-06-30",
            "is_active": False,
            "created_at": now_iso(),
        })

        # Demo teacher
        t1_id = gen_id()
        await db.users.insert_one({
            "id": t1_id,
            "email": "maestra.giulia@scuolapp.it",
            "first_name": "Giulia",
            "last_name": "Bianchi",
            "name": "Giulia Bianchi",
            "role": "teacher",
            "status": "active",
            "password_hash": hash_password("Maestra2026!"),
            "created_at": now_iso(),
        })

        # Classes
        c1, c2, c3 = gen_id(), gen_id(), gen_id()
        await db.classrooms.insert_many([
            {"id": c1, "name": "Coccinelle", "age_band": "3 anni", "notes": "Piccoli", "school_year_id": year_id, "teacher_ids": [t1_id], "created_at": now_iso()},
            {"id": c2, "name": "Farfalle", "age_band": "4 anni", "notes": "Medi", "school_year_id": year_id, "teacher_ids": [t1_id], "created_at": now_iso()},
            {"id": c3, "name": "Leoncini", "age_band": "5 anni", "notes": "Grandi", "school_year_id": year_id, "teacher_ids": [], "created_at": now_iso()},
        ])

        # Students
        students_data = [
            ("Alice", "Rossi", "2021-04-12"),
            ("Marco", "Verdi", "2021-08-22"),
            ("Sofia", "Russo", "2020-11-03"),
            ("Leonardo", "Ferrari", "2020-05-18"),
            ("Emma", "Conti", "2019-10-09"),
            ("Tommaso", "Marino", "2019-06-25"),
        ]
        student_ids = []
        for fn, ln, bd in students_data:
            sid = gen_id()
            student_ids.append(sid)
            await db.students.insert_one({
                "id": sid, "first_name": fn, "last_name": ln, "birth_date": bd,
                "fiscal_code": "", "residence": "", "allergies": "", "notes": "",
                "created_at": now_iso(),
            })
        # Enrollments
        await db.enrollments.insert_many([
            {"id": gen_id(), "student_id": student_ids[0], "classroom_id": c1, "school_year_id": year_id, "created_at": now_iso()},
            {"id": gen_id(), "student_id": student_ids[1], "classroom_id": c1, "school_year_id": year_id, "created_at": now_iso()},
            {"id": gen_id(), "student_id": student_ids[2], "classroom_id": c2, "school_year_id": year_id, "created_at": now_iso()},
            {"id": gen_id(), "student_id": student_ids[3], "classroom_id": c2, "school_year_id": year_id, "created_at": now_iso()},
            {"id": gen_id(), "student_id": student_ids[4], "classroom_id": c3, "school_year_id": year_id, "created_at": now_iso()},
            {"id": gen_id(), "student_id": student_ids[5], "classroom_id": c3, "school_year_id": year_id, "created_at": now_iso()},
        ])

        # Demo parent (active for easy testing)
        parent_id = gen_id()
        await db.users.insert_one({
            "id": parent_id,
            "email": "genitore@scuolapp.it",
            "first_name": "Laura",
            "last_name": "Rossi",
            "name": "Laura Rossi",
            "phone": "+39 333 1234567",
            "role": "parent",
            "status": "active",
            "password_hash": hash_password("Genitore2026!"),
            "created_at": now_iso(),
        })
        await db.parent_links.insert_one({"id": gen_id(), "parent_id": parent_id, "student_id": student_ids[0], "created_at": now_iso()})

        # Today activity for Alice (new shape — same as Flask original)
        today = date.today().isoformat()
        await db.activities.insert_one({
            "id": gen_id(),
            "student_id": student_ids[0],
            "date": today,
            "didattica": "Partecipato",
            "note_didattica": "Disegni con i colori a dita, ha lavorato sui colori primari",
            "motoria": "Partecipato",
            "note_motoria": "Giochi con la palla in giardino",
            "merenda": "Si",
            "pranzo": "Ha mangiato",
            "note_pranzo": "Ha gradito molto la pasta al pomodoro",
            "riposo": "Si",
            "cacca": "Si",
            "pipi": "Si",
            "note": "Giornata serena e collaborativa. Ha aiutato a riordinare i giochi.",
            "created_at": now_iso(),
        })

        # Rotating menu (4 weeks × 5 days) — uses real data from user's MySQL dump
        menu_id = gen_id()
        await db.menus.insert_one({
            "id": menu_id,
            "name": "Menu 2025/2026",
            "valid_from": "2025-09-15",
            "valid_to": "2026-06-30",
            "notes": "NOTA BENE: verdura e frutta subiranno variazioni in base alla stagione.",
            "school_year_id": year_id,
            "created_at": now_iso(),
        })
        # Real meal data from the user's s_pranzo (id_menu=1, 4 weeks × 5 days)
        meals_data = [
            # Settimana 1
            (1, "Lunedi", "Pasta con legumi (lenticchie)", "Prosciutto cotto", "Insalata", "Frutta fresca"),
            (1, "Martedi", "Pasta al pomodoro", "Tacchino", "Piselli", "Frutta di stagione"),
            (1, "Mercoledi", "Pasta e zucca", "Mozzarella", "Pomodori", "Frutta di stagione"),
            (1, "Giovedi", "Pasta al pomodoro", "Polpette", "Patate lesse", "Frutta di stagione"),
            (1, "Venerdi", "Pasta con legumi/patate", "Pesce", "Carote/Piselli", "Frutta fresca"),
            # Settimana 2
            (2, "Lunedi", "Pasta con legumi (lenticchie)", "Prosciutto cotto", "Pomodori", "Frutta di stagione"),
            (2, "Martedi", "Pasta al pomodoro", "Tacchino", "Piselli", "Frutta di stagione"),
            (2, "Mercoledi", "Pasta e zucca", "Mozzarella", "Insalata", "Frutta di stagione"),
            (2, "Giovedi", "Pasta al pomodoro", "Polpette", "Patate lesse", "Frutta di stagione"),
            (2, "Venerdi", "Pasta con legumi/patate", "Pesce", "Carote lesse", "Frutta fresca"),
            # Settimana 3
            (3, "Lunedi", "Pasta con legumi (lenticchie)", "Prosciutto cotto", "Insalata", "Frutta di stagione"),
            (3, "Martedi", "Pasta al pomodoro", "Tacchino", "Piselli", "Frutta di stagione"),
            (3, "Mercoledi", "Pasta e zucca", "Mozzarella", "Pomodori", "Frutta di stagione"),
            (3, "Giovedi", "Pasta al pomodoro", "Polpette", "Patate lesse", "Frutta di stagione"),
            (3, "Venerdi", "Pasta con legumi/patate", "Pesce", "Carote lesse", "Frutta di stagione"),
            # Settimana 4
            (4, "Lunedi", "Pasta con legumi (lenticchie)", "Prosciutto cotto", "Insalata", "Frutta di stagione"),
            (4, "Martedi", "Pasta al pomodoro", "Tacchino", "Piselli", "Frutta di stagione"),
            (4, "Mercoledi", "Pasta e zucca", "Mozzarella", "Pomodori", "Frutta di stagione"),
            (4, "Giovedi", "Pasta al pomodoro", "Polpette", "Patate lesse", "Frutta di stagione"),
            (4, "Venerdi", "Pasta con legumi/patate", "Pesce", "Carote lesse", "Frutta di stagione"),
        ]
        await db.menu_meals.insert_many([
            {"id": gen_id(), "menu_id": menu_id, "week": w, "day": d,
             "primo": p, "secondo": s, "contorno": c, "frutta": f, "created_at": now_iso()}
            for (w, d, p, s, c, f) in meals_data
        ])

        # News
        await db.news.insert_many([
            {"id": gen_id(), "title": "Festa di Carnevale", "body": "Martedì 17 febbraio festeggeremo il Carnevale: i bambini possono venire in maschera.", "category": "evento", "classroom_id": None, "publish_date": now_iso(), "author_name": "Direzione", "created_at": now_iso()},
            {"id": gen_id(), "title": "Riunione genitori", "body": "Giovedì alle 17:00 si terrà la riunione con i genitori della sezione Coccinelle.", "category": "avviso", "classroom_id": c1, "publish_date": now_iso(), "author_name": "Direzione", "created_at": now_iso()},
        ])

        # --- STEP 1h demo data ---
        # School profile
        await db.school_profile.update_one({"id": "main"}, {"$set": {
            "id": "main",
            "name": "L'Albero della Vita",
            "email": "alberodellavita2000@alice.it",
            "phone": "0818566418",
            "mobile": "3511992918",
            "whatsapp": "3921850455",
            "address": "Corso Nazionale, 171 - Scafati (SA)",
            "vat": "03686240650",
            "website": "https://www.lalberodellavitascafati.it",
            "facebook": "https://www.facebook.com/lalberodellavita",
            "instagram": "",
            "logo_base64": "",
            "updated_at": now_iso(),
        }}, upsert=True)

        # Calendar events (festivities)
        await db.calendar_events.insert_many([
            {"id": gen_id(), "name": "Inizio anno scolastico", "date": "2025-09-15", "category": "altro", "notes": "", "created_at": now_iso()},
            {"id": gen_id(), "name": "Chiusura Ognissanti", "date": "2025-11-01", "category": "festivita", "notes": "", "created_at": now_iso()},
            {"id": gen_id(), "name": "Chiusura Immacolata", "date": "2025-12-08", "category": "festivita", "notes": "", "created_at": now_iso()},
            {"id": gen_id(), "name": "Chiusura Natalizie", "date": "2025-12-24", "end_date": "2026-01-06", "category": "chiusura", "notes": "Riapertura 7 gennaio", "created_at": now_iso()},
            {"id": gen_id(), "name": "Festa di Carnevale", "date": "2026-02-17", "category": "festa", "notes": "Bambini in maschera", "created_at": now_iso()},
            {"id": gen_id(), "name": "Festa dei Nonni", "date": "2025-10-02", "category": "festa", "notes": "", "created_at": now_iso()},
            {"id": gen_id(), "name": "Riunione genitori Coccinelle", "date": "2026-05-22", "category": "riunione", "notes": "Ore 17:00", "created_at": now_iso()},
        ])

        # Extra labs (palinsesto)
        await db.extra_labs.insert_many([
            {"id": gen_id(), "classroom_id": c1, "day_of_week": "lunedì", "title": "Musicoterapia", "teacher_name": "Graziella Bambace", "created_at": now_iso()},
            {"id": gen_id(), "classroom_id": c1, "day_of_week": "mercoledì", "title": "Psicomotricità", "teacher_name": "Sabrina Giallo", "created_at": now_iso()},
            {"id": gen_id(), "classroom_id": c2, "day_of_week": "martedì", "title": "Teatro", "teacher_name": "Tonia Aprea", "created_at": now_iso()},
            {"id": gen_id(), "classroom_id": c2, "day_of_week": "giovedì", "title": "Psicomotricità", "teacher_name": "Ornella Aprea", "created_at": now_iso()},
            {"id": gen_id(), "classroom_id": c2, "day_of_week": "venerdì", "title": "Laboratorio Arte", "teacher_name": "Maestra Pina", "created_at": now_iso()},
            {"id": gen_id(), "classroom_id": c3, "day_of_week": "martedì", "title": "Inglese", "teacher_name": "Maestra Tonia", "created_at": now_iso()},
            {"id": gen_id(), "classroom_id": c3, "day_of_week": "giovedì", "title": "Motoria", "teacher_name": "Maestra Anna", "created_at": now_iso()},
        ])

        # Lesson plans
        await db.lesson_plans.insert_many([
            {"id": gen_id(), "classroom_id": c1, "school_year_id": year_id,
             "date_from": (date.today() - timedelta(days=date.today().weekday())).isoformat(),
             "date_to": (date.today() + timedelta(days=4 - date.today().weekday())).isoformat(),
             "title": "Settimana del personaggio guida: Simba",
             "body": "<p>Questa settimana presentiamo ai bambini il nostro <strong>personaggio guida</strong>: <em>Simba</em>. Attraverso racconti e canzoni esploreremo l'importanza della <strong>famiglia</strong>.</p><ul><li>Lunedì: presentazione di Simba con immagini</li><li>Martedì: cartellone della famiglia</li><li>Mercoledì: filastrocca</li><li>Giovedì: laboratorio di disegno</li><li>Venerdì: festa di chiusura settimana</li></ul>",
             "created_at": now_iso(), "created_by": t1_id},
            {"id": gen_id(), "classroom_id": c2, "school_year_id": year_id,
             "date_from": (date.today() - timedelta(days=date.today().weekday()+7)).isoformat(),
             "date_to": (date.today() - timedelta(days=date.today().weekday()+3)).isoformat(),
             "title": "Settimana dei colori secondari",
             "body": "<p>Lavoriamo sui colori secondari: <strong>arancione</strong>, <strong>verde</strong>, <strong>viola</strong>. Attraverso le tempere mostriamo come dai colori primari si ottengono i secondari.</p>",
             "created_at": now_iso(), "created_by": t1_id},
        ])

        # Communications (with photo)
        comm1, comm2 = gen_id(), gen_id()
        await db.communications.insert_many([
            {"id": comm1, "title": "Giornata mondiale della Gentilezza", "body": "<p>Il 13 novembre celebriamo la Giornata Mondiale della Gentilezza. Coinvolgeremo i bambini con racconti e attività dedicate.</p>",
             "type": "evento_attivita", "classroom_id": c1, "publish_date": now_iso(), "media_ids": [], "author_name": "Maestra Giulia", "created_at": now_iso()},
            {"id": comm2, "title": "Visita didattica alla fattoria", "body": "<p>Il prossimo mercoledì usciremo per una visita didattica alla <em>Fattoria didattica</em>. Vi chiediamo cortesemente di:</p><ul><li>vestire i bambini comodi</li><li>portare una bottiglietta d'acqua</li></ul>",
             "type": "comunicazione_classe", "classroom_id": c2, "publish_date": now_iso(), "media_ids": [], "author_name": "Maestra Giulia", "created_at": now_iso()},
        ])

        # Barcodes for all students
        for idx, sid in enumerate(student_ids):
            await db.barcodes.update_one(
                {"student_id": sid},
                {"$set": {"id": gen_id(), "student_id": sid, "code": f"260515{idx+1:05d}", "created_at": now_iso()}},
                upsert=True,
            )

        # Sample attendance today (Alice checked in this morning)
        today_iso = date.today().isoformat()
        check_ts = datetime.now(timezone.utc).replace(hour=8, minute=15, second=0).isoformat()
        await db.attendance.insert_one({
            "id": gen_id(), "student_id": student_ids[0], "action": "in",
            "ts": check_ts, "date": today_iso, "note": "", "by_user_id": t1_id,
        })

        logger.info("Demo data seeded (incl. STEP 1h)")


# ----------------------------- App wiring -----------------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # using Bearer token in localStorage for simplicity & cross-origin support
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_start():
    await seed()


@app.on_event("shutdown")
async def shutdown():
    client.close()
