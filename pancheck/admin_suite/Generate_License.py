import sqlite3
import licensing
import datetime
import os

DB_FILE = 'admin_vibe.db'

def setup_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS licenses
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  key_string TEXT,
                  days INTEGER,
                  created_at TEXT,
                  used INTEGER DEFAULT 0)''')
    conn.commit()
    conn.close()

def generate_and_save(days):
    key = licensing.generate_key(days)
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT INTO licenses (key_string, days, created_at) VALUES (?, ?, ?)",
              (key, days, datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
    conn.commit()
    conn.close()
    return key

def list_keys():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT id, key_string, days, created_at, used FROM licenses ORDER BY id DESC")
    rows = c.fetchall()
    conn.close()
    return rows

if __name__ == "__main__":
    setup_db()
    print("=== PAN Checker Admin Tool ===")
    print("1. Generate New Key")
    print("2. List All Keys")
    print("3. Exit")
    
    choice = input("Select an option: ")
    
    if choice == '1':
        days = int(input("Enter number of days for validity: "))
        key = generate_and_save(days)
        print(f"\nGenerated Key: {key}")
        print("Copy and send this to the user.\n")
    elif choice == '2':
        keys = list_keys()
        print("\nID | Key | Days | Created At | Used")
        print("-" * 50)
        for k in keys:
            # Show shortened key for readability
            short_key = k[1][:10] + "..." + k[1][-10:]
            print(f"{k[0]} | {short_key} | {k[2]} | {k[3]} | {'Yes' if k[4] else 'No'}")
    else:
        print("Exiting...")
