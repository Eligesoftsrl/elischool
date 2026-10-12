"""
Migrazione MySQL (PythonAnywhere) → MongoDB Tiptii, in un nuovo tenant.

Importa: anagrafiche (alunni, genitori, maestre), relazioni, sezioni, iscrizioni,
         barcode, comunicazioni, eventi, piano didattico, menu, extra, 1414 attività.
Esclude: foto (s_photo, s_multimedia).

Account genitori/maestre: creati in stato 'pending' (nessuna password MD5 legacy
riusata). L'admin potrà invitarli dall'UI con 'Resetta password'.

Esecuzione: `python3 backend/scripts/mysql_migrate.py`
"""
import os
import uuid
import hashlib
from datetime import datetime, timezone, date

import pymysql
from pymongo import MongoClient
from sshtunnel import SSHTunnelForwarder

# ---- credenziali ----
SSH_HOST = "ssh.pythonanywhere.com"; SSH_USER = "Eligesoft2"; SSH_PASS = "19Elige20@"
MY_HOST = "Eligesoft2.mysql.pythonanywhere-services.com"
MY_USER = "Eligesoft2"; MY_PASS = "pasq0378"; MY_DB = "Eligesoft2$elischool"

MONGO_URL = os.environ.get("MONGO_URL") or "mongodb://localhost:27017"
MONGO_DB = os.environ.get("DB_NAME") or "kindergarten_db"

# ---- target tenant ----
TENANT_NAME = "L'Albero della Vita"
TENANT_SLUG = "albero-della-vita"
TENANT_EMAIL = "alberodellavita2000@alice.it"

SY_LABEL = "2026/2027"
SY_START = "2026-09-01"
SY_END = "2027-07-31"


# =========================================================================
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def gid() -> str:
    return str(uuid.uuid4())

def to_iso_date(v):
    """datetime.date | datetime.datetime | str → 'YYYY-MM-DD' (or '')"""
    if not v: return ""
    if isinstance(v, (datetime,)): return v.strftime("%Y-%m-%d")
    if isinstance(v, date): return v.strftime("%Y-%m-%d")
    return str(v)[:10]

def to_iso_dt(v):
    if not v: return now_iso()
    if isinstance(v, datetime):
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.isoformat()
    if isinstance(v, date):
        return datetime(v.year, v.month, v.day, tzinfo=timezone.utc).isoformat()
    return str(v)

def norm(s):
    return (s or "").strip()

def email_of(v, fallback_prefix, tenant_slug):
    """Clean email or synthesize a placeholder (users without email need one for the UNIQUE login)."""
    e = norm(v).lower()
    if "@" in e and "." in e: return e
    # synthesize deterministic placeholder
    h = hashlib.md5((fallback_prefix or gid()).encode()).hexdigest()[:8]
    return f"noemail-{h}@{tenant_slug}.tiptii.local"


# =========================================================================
def main():
    print("[1] SSH tunnel + MySQL connect…")
    tunnel = SSHTunnelForwarder(
        (SSH_HOST, 22), ssh_username=SSH_USER, ssh_password=SSH_PASS,
        remote_bind_address=(MY_HOST, 3306), local_bind_address=("127.0.0.1", 0),
    )
    tunnel.start()
    try:
        myconn = pymysql.connect(
            host="127.0.0.1", port=tunnel.local_bind_port,
            user=MY_USER, password=MY_PASS, database=MY_DB,
            charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor,
        )
        try:
            mongo = MongoClient(MONGO_URL)
            db = mongo[MONGO_DB]
            run_migration(myconn, db)
        finally:
            myconn.close()
    finally:
        tunnel.stop()


def run_migration(myconn, db):
    print(f"[2] Target MongoDB: {MONGO_DB}")

    # Tenant
    existing = db.tenants.find_one({"slug": TENANT_SLUG})
    if existing:
        print(f"    ⚠  Tenant esistente '{TENANT_SLUG}' id={existing['id']}. Rimuovo tutti i suoi dati scoped e re-importo.")
        tenant_id = existing["id"]
        for coll in ["students","users","classrooms","enrollments","activities","barcodes",
                     "communications","calendar_events","lesson_plans","menus","menu_meals",
                     "extra_labs","school_years","parent_links"]:
            n = db[coll].delete_many({"tenant_id": tenant_id}).deleted_count
            if n: print(f"       └─ {coll}: eliminati {n}")
    else:
        tenant_id = gid()
        db.tenants.insert_one({
            "id": tenant_id, "slug": TENANT_SLUG, "name": TENANT_NAME,
            "contact_email": TENANT_EMAIL, "plan": "pro", "status": "active",
            "created_at": now_iso(),
        })
        print(f"    ✓ Tenant creato: {TENANT_NAME} ({TENANT_SLUG}) id={tenant_id}")

    # Anno scolastico
    sy_id = gid()
    db.school_years.insert_one({
        "id": sy_id, "tenant_id": tenant_id,
        "label": SY_LABEL, "start_date": SY_START, "end_date": SY_END,
        "is_active": True, "created_at": now_iso(),
    })
    print(f"    ✓ Anno scolastico attivo: {SY_LABEL}")

    cur = myconn.cursor()

    # -------------------- s_aule → classrooms --------------------
    cur.execute("SELECT * FROM s_aule")
    aule = cur.fetchall()
    aula_map = {}  # mysql_id → mongo_id
    for a in aule:
        mid = gid()
        aula_map[a["Id"]] = mid
        db.classrooms.insert_one({
            "id": mid, "tenant_id": tenant_id, "school_year_id": sy_id,
            "name": norm(a["Nome"]) or f"Sezione {a['Id']}",
            "age_band": norm(a["Fascia"]) or "n.d.",
            "notes": norm(a.get("Note")),
            "teacher_ids": [],
            "created_at": to_iso_dt(a.get("Datai")),
        })
    print(f"[3] Sezioni importate: {len(aule)}")

    # -------------------- team → users (teacher/admin) --------------------
    cur.execute("SELECT * FROM team")
    team = cur.fetchall()
    team_map = {}  # mysql_id → mongo_user_id
    for t in team:
        mid = gid()
        team_map[t["Id"]] = mid
        role = "admin" if (norm(t.get("Ruolo")).lower() == "admin") else "teacher"
        em = email_of(t.get("Email"), f"team-{t['Id']}", TENANT_SLUG)
        if db.users.find_one({"email": em}):
            # collision across tenants → fall back to per-tenant placeholder
            em = f"{em.split('@')[0]}+{TENANT_SLUG}@{em.split('@')[1]}"
        fn, ln = norm(t.get("Nome")), norm(t.get("Cognome"))
        db.users.insert_one({
            "id": mid, "tenant_id": tenant_id, "role": role,
            "email": em, "first_name": fn, "last_name": ln,
            "name": f"{fn} {ln}".strip(),
            "phone": norm(t.get("Cellulare")),
            "notes": "", "status": "pending",
            "password_hash": None,
            "created_at": now_iso(),
        })
    print(f"[4] Staff importato: {len(team)} (status=pending)")

    # -------------------- s_masterclass → classroom.teacher_ids --------------------
    cur.execute("SELECT * FROM s_masterclass")
    for mc in cur.fetchall():
        aula_mid = aula_map.get(mc["id_aula"])
        teacher_mid = team_map.get(mc["id_docente"])
        if aula_mid and teacher_mid:
            db.classrooms.update_one({"id": aula_mid}, {"$addToSet": {"teacher_ids": teacher_mid}})
    print(f"    └─ assegnazioni maestre↔sezioni mappate")

    # -------------------- s_alunni → students (+ enrollment) --------------------
    cur.execute("SELECT * FROM s_alunni")
    alunni = cur.fetchall()
    alunno_map = {}
    cur.execute("SELECT id_alunno, id_aula FROM s_classi")
    aula_of_alunno = {r["id_alunno"]: r["id_aula"] for r in cur.fetchall()}
    for s in alunni:
        mid = gid()
        alunno_map[s["Id"]] = mid
        db.students.insert_one({
            "id": mid, "tenant_id": tenant_id,
            "first_name": norm(s["Nome"]), "last_name": norm(s["Cognome"]),
            "birth_date": to_iso_date(s.get("Datan")),
            "fiscal_code": norm(s.get("Codifisc")).upper(),
            "city_residence": "",
            "residence": norm(s.get("Residenza")),  # qui c'era il CAP, lo salviamo come indirizzo
            "allergies": norm(s.get("Allergie")),
            "notes": norm(s.get("Note")),
            "status": "active",
            "created_at": to_iso_dt(s.get("Datai")),
        })
        aula_mysql_id = aula_of_alunno.get(s["Id"])
        if aula_mysql_id and aula_mysql_id in aula_map:
            db.enrollments.insert_one({
                "id": gid(), "tenant_id": tenant_id,
                "student_id": mid, "classroom_id": aula_map[aula_mysql_id],
                "school_year_id": sy_id,
                "created_at": now_iso(),
            })
    enrolled = db.enrollments.count_documents({"tenant_id": tenant_id})
    print(f"[5] Alunni importati: {len(alunni)} · iscrizioni create: {enrolled}")

    # -------------------- s_genitori → users (role=parent) --------------------
    cur.execute("SELECT * FROM s_genitori")
    genitori = cur.fetchall()
    gen_map = {}
    skipped = 0
    for g in genitori:
        mid = gid()
        gen_map[g["Id"]] = mid
        em = email_of(g.get("Email"), f"parent-{g['Id']}", TENANT_SLUG)
        # dedupe email across all tenants (users.email is global unique via login lookup)
        if db.users.find_one({"email": em}):
            em = f"{em.split('@')[0]}+{TENANT_SLUG}-{g['Id']}@{em.split('@')[1]}"
        fn, ln = norm(g.get("Nome")), norm(g.get("Cognome"))
        db.users.insert_one({
            "id": mid, "tenant_id": tenant_id, "role": "parent",
            "email": em, "first_name": fn, "last_name": ln,
            "name": f"{fn} {ln}".strip(),
            "phone": norm(g.get("Telefono")),
            "fiscal_code": norm(g.get("Codifisc")).upper(),
            "notes": norm(g.get("Note")),
            "status": "pending",
            "password_hash": None,
            "student_ids": [],
            "created_at": to_iso_dt(g.get("Datai")),
        })
    print(f"[6] Genitori importati: {len(genitori)} (status=pending)")

    # -------------------- s_parentela → parent.student_ids + parent_links --------------------
    cur.execute("SELECT * FROM s_parentela")
    linked = 0
    for p in cur.fetchall():
        a_mid, g_mid = alunno_map.get(p["id_alunno"]), gen_map.get(p["id_genitore"])
        if a_mid and g_mid:
            db.users.update_one({"id": g_mid}, {"$addToSet": {"student_ids": a_mid}})
            # Legacy API usa anche la collezione parent_links (join table): la popoliamo entrambe.
            db.parent_links.insert_one({
                "id": gid(), "tenant_id": tenant_id,
                "parent_id": g_mid, "student_id": a_mid,
                "created_at": now_iso(),
            })
            linked += 1
    print(f"    └─ parentele collegate: {linked}")

    # -------------------- s_barcode → barcodes --------------------
    cur.execute("SELECT * FROM s_barcode")
    bc = 0
    for b in cur.fetchall():
        a_mid = alunno_map.get(b["Idc"])
        if not a_mid: continue
        db.barcodes.insert_one({
            "id": gid(), "tenant_id": tenant_id,
            "student_id": a_mid, "code": norm(b["Barcode"]),
            "created_at": now_iso(),
        })
        bc += 1
    print(f"[7] Barcode importati: {bc}")

    # -------------------- s_deal → communications --------------------
    cur.execute("SELECT * FROM s_deal")
    deals = cur.fetchall()
    type_map = {
        "comunicazione di classe": "comunicazione_classe",
        "evento o attivita": "evento_attivita",
        "evento o attività": "evento_attivita",
        "avviso": "avviso",
    }
    for d in deals:
        tipo_raw = norm(d.get("Tipologia")).lower()
        tipo = type_map.get(tipo_raw, "comunicazione_classe")
        aula_mid = None
        try:
            aula_mid = aula_map.get(int(d.get("classe"))) if d.get("classe") else None
        except (ValueError, TypeError):
            pass
        db.communications.insert_one({
            "id": gid(), "tenant_id": tenant_id,
            "title": norm(d["Titolo"]), "body": norm(d["Testo"]),
            "type": tipo, "classroom_id": aula_mid,
            "media_ids": [], "publish_date": to_iso_dt(d.get("Data")),
            "created_at": to_iso_dt(d.get("Data")),
        })
    print(f"[8] Comunicazioni importate: {len(deals)}")

    # -------------------- s_evento → calendar_events --------------------
    cur.execute("SELECT * FROM s_evento")
    events = cur.fetchall()
    for e in events:
        db.calendar_events.insert_one({
            "id": gid(), "tenant_id": tenant_id,
            "name": norm(e["Nome"]), "date": to_iso_date(e.get("Data")),
            "notes": norm(e.get("Note")),
            "created_at": now_iso(),
        })
    print(f"[9] Eventi importati: {len(events)}")

    # -------------------- s_piano → lesson_plans --------------------
    cur.execute("SELECT * FROM s_piano")
    pianos = cur.fetchall()
    for p in pianos:
        aula_mid = None
        try:
            aula_mid = aula_map.get(int(p.get("titolo"))) if p.get("titolo") else None
        except (ValueError, TypeError):
            pass
        db.lesson_plans.insert_one({
            "id": gid(), "tenant_id": tenant_id,
            "title": f"Settimana {to_iso_date(p.get('dal'))}",
            "body": norm(p.get("testo")),
            "date_from": to_iso_date(p.get("dal")),
            "date_to": to_iso_date(p.get("al")),
            "school_year_id": sy_id,
            "classroom_ids": [aula_mid] if aula_mid else [],
            "classroom_id": aula_mid,  # legacy single-ref
            "created_at": now_iso(),
        })
    print(f"[10] Piani didattici importati: {len(pianos)}")

    # -------------------- s_menu + s_pranzo → menus + menu_meals --------------------
    cur.execute("SELECT * FROM s_menu")
    menus = cur.fetchall()
    menu_map = {}
    for m in menus:
        mid = gid()
        menu_map[m["id"]] = mid
        db.menus.insert_one({
            "id": mid, "tenant_id": tenant_id,
            "name": norm(m["nome"]),
            "valid_from": to_iso_date(m.get("dal")),
            "valid_to": to_iso_date(m.get("al")),
            "notes": norm(m.get("note")),
            "created_at": now_iso(),
        })
    cur.execute("SELECT * FROM s_pranzo")
    pranzi = cur.fetchall()
    for pr in pranzi:
        menu_mid = menu_map.get(pr["id_menu"])
        if not menu_mid: continue
        db.menu_meals.insert_one({
            "id": gid(), "tenant_id": tenant_id,
            "menu_id": menu_mid,
            "week": int(pr.get("settimana") or 1),
            "day": norm(pr.get("giorno")),
            "primo": norm(pr.get("primo")),
            "secondo": norm(pr.get("secondo")),
            "contorno": norm(pr.get("contorno")),
            "frutta": norm(pr.get("frutta")),
            "created_at": now_iso(),
        })
    print(f"[11] Menu importati: {len(menus)} · pranzi: {len(pranzi)}")

    # -------------------- s_extra → extra_labs --------------------
    cur.execute("SELECT * FROM s_extra")
    extras = cur.fetchall()
    for ex in extras:
        aula_mid = None
        try:
            aula_mid = aula_map.get(int(ex.get("classe"))) if ex.get("classe") else None
        except (ValueError, TypeError):
            pass
        db.extra_labs.insert_one({
            "id": gid(), "tenant_id": tenant_id,
            "classroom_id": aula_mid, "day": norm(ex.get("giorno")),
            "text": norm(ex.get("testo")),
            "created_at": now_iso(),
        })
    print(f"[12] Laboratori extra importati: {len(extras)}")

    # -------------------- s_attivita → activities (1414) --------------------
    # Legacy MySQL ha più entry diario stesso giorno/alunno. Nostro schema richiede unicità (student_id, date):
    # faccio upsert con "latest wins" (ordinando per datai asc).
    cur.execute("SELECT * FROM s_attivita ORDER BY datai ASC")
    rows = cur.fetchall()
    inserted, updated = 0, 0
    for a in rows:
        a_mid = alunno_map.get(a["id_alunno"])
        if not a_mid: continue
        dt = a.get("datai")
        date_str = to_iso_date(dt) if dt else ""
        if not date_str: continue
        doc = {
            "tenant_id": tenant_id,
            "student_id": a_mid, "date": date_str,
            "didattica": norm(a.get("didattica")),
            "note_didattica": norm(a.get("note_didattica")),
            "motoria": norm(a.get("motoria")),
            "note_motoria": norm(a.get("note_motoria")),
            "merenda": norm(a.get("merenda")),
            "pranzo": norm(a.get("pranzo")),
            "note_pranzo": norm(a.get("note_pranzo")),
            "riposo": norm(a.get("riposo")),
            "bagno": norm(a.get("bagno")),
            "cacca": norm(a.get("cacca")),
            "pipi": norm(a.get("pipi")),
            "notes": norm(a.get("note")),
            "created_at": to_iso_dt(dt),
            "created_by": None,
        }
        res = db.activities.update_one(
            {"tenant_id": tenant_id, "student_id": a_mid, "date": date_str},
            {"$set": doc, "$setOnInsert": {"id": gid()}},
            upsert=True,
        )
        if res.upserted_id: inserted += 1
        else: updated += 1
    activities_count = db.activities.count_documents({"tenant_id": tenant_id})
    print(f"[13] Attività importate: {activities_count} (nuove {inserted}, consolidate {updated})")

    # -------------------- Report finale --------------------
    print("\n" + "=" * 60)
    print("  MIGRAZIONE COMPLETATA")
    print("=" * 60)
    for coll in ["school_years","classrooms","users","students","enrollments",
                 "barcodes","communications","calendar_events","lesson_plans",
                 "menus","menu_meals","extra_labs","activities"]:
        n = db[coll].count_documents({"tenant_id": tenant_id})
        print(f"   {coll:22s} {n:>5d}")
    print()
    print(f"   Tenant id    : {tenant_id}")
    print(f"   Tenant slug  : /iscrizione/{TENANT_SLUG}")
    print(f"   Login admin  : vai in Superadmin → Modifica → Reset Password Admin")


if __name__ == "__main__":
    main()
