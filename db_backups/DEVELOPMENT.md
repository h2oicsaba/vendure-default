# Vendure Database Management Guide

This simplified guide explains how to manage your Vendure database backups and restores.

## 1. Creating a Database Dump

To create a backup of your Vendure database:

```bash
# For local database
PGPASSWORD=zsolika pg_dump -h localhost -U need-it -d vendure -f /home/csaba/vendure/db_backups/vendure_backup.sql

# For Railway database
PGPASSWORD=KSFyiAWInUgRcANbJgUzMknhGcrjLCAd pg_dump -h shinkansen.proxy.rlwy.net -U postgres -p 35121 -d railway -f /home/csaba/vendure/db_backups/vendure_backup.sql
```

## 2. Importing a Database Dump

To import a database dump into another database:

```bash
# For local database
PGPASSWORD=zsolika psql -h localhost -U need-it -d vendure -f /home/csaba/vendure/db_backups/vendure_backup.sql

# For Railway database
PGPASSWORD=KSFyiAWInUgRcANbJgUzMknhGcrjLCAd psql -h shinkansen.proxy.rlwy.net -U postgres -p 35121 -d railway -f /home/csaba/vendure/db_backups/vendure_backup.sql
```

## 3. Resetting the Database Before Import

If you need to reset the database before importing (to avoid conflicts):

```bash
# For local database
PGPASSWORD=zsolika psql -h localhost -U need-it -d vendure -f /home/csaba/vendure/db_backups/vendure_delete.sql

# For Railway database
PGPASSWORD=KSFyiAWInUgRcANbJgUzMknhGcrjLCAd psql -h shinkansen.proxy.rlwy.net -U postgres -p 35121 -d railway -f /home/csaba/vendure/db_backups/vendure_delete.sql
```

The \`vendure_delete.sql\` script will:
1. Terminate all active connections to the database
2. Drop all tables, sequences, views, functions, and types
3. Reset the search path
4. Vacuum the database to reclaim space

After running the delete script, you can safely import your backup without conflicts.
