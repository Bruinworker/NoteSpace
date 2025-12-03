#!/usr/bin/env python3
"""
Database migration script to:
- make user_id nullable in notes table
- add view_count / upvote_count columns.
"""
import sqlite3
import os
import shutil
from datetime import datetime

db_path = "notespace.db"
backup_path = f"notespace.db.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"

if not os.path.exists(db_path):
    print(f"Database {db_path} not found. Nothing to migrate.")
    raise SystemExit(0)

print(f"Migrating database: {db_path}")
print(f"Creating backup: {backup_path}")

# Create backup
shutil.copy2(db_path, backup_path)
print("✓ Backup created")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Make sure notes table exists
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='notes';"
    )
    row = cursor.fetchone()
    if not row:
        print("Table 'notes' not found. Nothing to migrate.")
        raise SystemExit(0)

    # Disable foreign keys while we reshape the table
    cursor.execute("PRAGMA foreign_keys = OFF;")

    # --- Create new table with desired schema, including counters ---
    cursor.execute(
        """
        CREATE TABLE notes_new (
            id INTEGER NOT NULL PRIMARY KEY,
            user_id INTEGER,
            topic_id INTEGER NOT NULL,
            file_url VARCHAR(500) NOT NULL,
            original_filename VARCHAR(255) NOT NULL,
            file_size INTEGER NOT NULL,
            uploaded_at DATETIME NOT NULL,
            view_count INTEGER NOT NULL DEFAULT 0,
            upvote_count INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users (id),
            FOREIGN KEY(topic_id) REFERENCES topics (id)
        );
        """
    )

    # Copy data from old table, setting new counts to 0
    cursor.execute(
        """
        INSERT INTO notes_new (
            id, user_id, topic_id, file_url,
            original_filename, file_size, uploaded_at,
            view_count, upvote_count
        )
        SELECT
            id,
            CASE WHEN user_id = 0 THEN NULL ELSE user_id END AS user_id,
            topic_id,
            file_url,
            original_filename,
            file_size,
            uploaded_at,
            0 AS view_count,
            0 AS upvote_count
        FROM notes;
        """
    )

    # Drop old table and rename new one
    cursor.execute("DROP TABLE notes;")
    cursor.execute("ALTER TABLE notes_new RENAME TO notes;")

    # Re-enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON;")

    conn.commit()
    print("✓ Migration completed successfully")

except SystemExit:
    # just bubble out cleanly
    pass
except Exception as e:
    conn.rollback()
    print(f"✗ Migration failed: {e}")
    print("Restoring from backup...")
    shutil.copy2(backup_path, db_path)
    print("✓ Database restored from backup")
    raise SystemExit(1)
finally:
    conn.close()
