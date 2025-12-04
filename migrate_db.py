
#!/usr/bin/env python3
"""
Database migration script to make user_id nullable in notes table.

This script handles the migration of the notes table to make the user_id
column nullable. Since SQLite doesn't support ALTER COLUMN directly, it
recreates the table with the new schema.

The script creates a backup before making any changes to ensure data safety.
"""
import sqlite3
import os
import shutil
from datetime import datetime

DATABASE_FILENAME = 'notespace.db'
BACKUP_TIMESTAMP_FORMAT = "%Y%m%d_%H%M%S"

if not os.path.exists(DATABASE_FILENAME):
    print(f"Database {DATABASE_FILENAME} not found. Nothing to migrate.")
    exit(0)

backup_filename = f'{DATABASE_FILENAME}.backup.{datetime.now().strftime(BACKUP_TIMESTAMP_FORMAT)}'
print(f"Migrating database: {DATABASE_FILENAME}")
print(f"Creating backup: {backup_filename}")

# Create backup before making any changes
shutil.copy2(DATABASE_FILENAME, backup_filename)
print("✓ Backup created")

# Connect to database
database_connection = sqlite3.connect(DATABASE_FILENAME)
database_cursor = database_connection.cursor()

try:
    # SQLite doesn't support ALTER COLUMN, so we need to recreate the table
    # Step 1: Create new table with nullable user_id
    database_cursor.execute("""
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
    database_cursor.execute("""
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
    database_cursor.execute("DROP TABLE notes")
    
    # Step 4: Rename new table to original name
    database_cursor.execute("ALTER TABLE notes_new RENAME TO notes")
    
    database_connection.commit()
    print("✓ Migration completed successfully")
    
except Exception as migration_error:
    database_connection.rollback()
    print(f"✗ Migration failed: {migration_error}")
    print(f"Restoring from backup...")
    shutil.copy2(backup_filename, DATABASE_FILENAME)
    print("✓ Database restored from backup")
    exit(1)
finally:
    database_connection.close()

