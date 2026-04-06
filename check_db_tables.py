
import os
import psycopg2

db_url = "postgresql://postgres:estoesGRANDE333#@db.pviwmlbusbuzedtbyieu.supabase.co:5432/postgres"

def check():
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        tables = cur.fetchall()
        print("Tables in public schema:")
        for t in tables:
            print(f"- {t[0]}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check()
