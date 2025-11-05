#!/usr/bin/env python3
"""
Database migration script to make user_id nullable in notes table
"""
import sqlite3
import os
import shutil
from datetime import datetime

db_path = 'notespace.db'
backup_path = f'notespace.db.backup.{datetime.now().strftime("%Y%m%d_%H%M%S")}'

if not os.path.exists(db_path):
    print(f"Database {db_path} not found. Nothing to migrate.")
    exit(0)

print(f"Migrating database: {db_path}")
print(f"Creating backup: {backup_path}")

# Create backup
shutil.copy2(db_path, backup_path)
print("✓ Backup created")

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # SQLite doesn't support ALTER COLUMN, so we need to recreate the table
    # Step 1: Create new table with nullable user_id
    cursor.execute("""
        CREATE TABLE notes_new (
            id INTEGER NOT NULL PRIMARY KEY,
            user_id INTEGER,
            topic_id INTEGER NOT NULL,
            file_url VARCHAR(500) NOT NULL,
            original_filename VARCHAR(255) NOT NULL,
            file_size INTEGER NOT NULL,
            uploaded_at DATETIME NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users (id),
            FOREIGN KEY(topic_id) REFERENCES topics (id)
        )
    """)
    
    # Step 2: Copy data from old table (set NULL for user_id if it's 0 or invalid)
    cursor.execute("""
        INSERT INTO notes_new (id, user_id, topic_id, file_url, original_filename, file_size, uploaded_at)
        SELECT id, 
               CASE WHEN user_id = 0 THEN NULL ELSE user_id END,
               topic_id, 
               file_url, 
               original_filename, 
               file_size, 
               uploaded_at
        FROM notes
    """)
    
    # Step 3: Drop old table
    cursor.execute("DROP TABLE notes")
    
    # Step 4: Rename new table
    cursor.execute("ALTER TABLE notes_new RENAME TO notes")
    
    conn.commit()
    print("✓ Migration completed successfully")
    
except Exception as e:
    conn.rollback()
    print(f"✗ Migration failed: {e}")
    print(f"Restoring from backup...")
    shutil.copy2(backup_path, db_path)
    print("✓ Database restored from backup")
    exit(1)
finally:
    conn.close()

