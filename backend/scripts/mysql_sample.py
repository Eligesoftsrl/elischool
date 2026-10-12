"""Sample rows to understand formats and encoding."""
import pymysql
from sshtunnel import SSHTunnelForwarder

SSH_HOST = "ssh.pythonanywhere.com"; SSH_USER = "Eligesoft2"; SSH_PASS = "19Elige20@"
MY_HOST = "Eligesoft2.mysql.pythonanywhere-services.com"
MY_USER = "Eligesoft2"; MY_PASS = "pasq0378"; MY_DB = "Eligesoft2$elischool"

with SSHTunnelForwarder((SSH_HOST, 22), ssh_username=SSH_USER, ssh_password=SSH_PASS,
                        remote_bind_address=(MY_HOST, 3306), local_bind_address=("127.0.0.1", 0)) as t:
    conn = pymysql.connect(host="127.0.0.1", port=t.local_bind_port, user=MY_USER, password=MY_PASS,
                           database=MY_DB, charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor)
    try:
        with conn.cursor() as c:
            for table in ["s_alunni", "s_genitori", "s_parentela", "s_aule", "s_classi",
                          "s_attivita", "s_barcode", "s_deal", "s_evento", "s_piano",
                          "s_menu", "s_pranzo", "s_extra", "s_masterclass", "team"]:
                print(f"\n=== {table} ===")
                c.execute(f"SELECT * FROM `{table}` LIMIT 2")
                for r in c.fetchall():
                    # truncate long fields
                    pretty = {k: (str(v)[:80] + "…") if isinstance(v, str) and len(str(v)) > 80 else v for k, v in r.items()}
                    print(" ", pretty)
    finally:
        conn.close()
