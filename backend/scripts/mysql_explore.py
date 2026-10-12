"""
Explore remote MySQL schema (PythonAnywhere) via SSH tunnel.

Only lists tables + a sample row for each — safe/read-only.
"""
import pymysql
from sshtunnel import SSHTunnelForwarder

SSH_HOST = "ssh.pythonanywhere.com"
SSH_USER = "Eligesoft2"
SSH_PASS = "19Elige20@"

MYSQL_HOST = "Eligesoft2.mysql.pythonanywhere-services.com"
MYSQL_PORT = 3306
MYSQL_USER = "Eligesoft2"
MYSQL_PASS = "pasq0378"
MYSQL_DB = "Eligesoft2$elischool"

print("[1/3] Apertura tunnel SSH…")
with SSHTunnelForwarder(
    (SSH_HOST, 22),
    ssh_username=SSH_USER,
    ssh_password=SSH_PASS,
    remote_bind_address=(MYSQL_HOST, MYSQL_PORT),
    local_bind_address=("127.0.0.1", 0),
) as tunnel:
    print(f"    ✓ Tunnel attivo su 127.0.0.1:{tunnel.local_bind_port}")

    print("[2/3] Connessione MySQL…")
    conn = pymysql.connect(
        host="127.0.0.1",
        port=tunnel.local_bind_port,
        user=MYSQL_USER,
        password=MYSQL_PASS,
        database=MYSQL_DB,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )
    try:
        with conn.cursor() as cur:
            print("[3/3] Elenco tabelle:\n")
            cur.execute("SHOW TABLES")
            tables = [list(row.values())[0] for row in cur.fetchall()]
            for t in tables:
                cur.execute(f"SELECT COUNT(*) c FROM `{t}`")
                cnt = cur.fetchone()["c"]
                cur.execute(f"DESCRIBE `{t}`")
                cols = [r["Field"] for r in cur.fetchall()]
                print(f"  📋 {t:<30s} rows={cnt:<5d} cols={cols}")
    finally:
        conn.close()

print("\n[OK] Esplorazione completata.")
