# Database Management Guide

This document contains essential information for managing the Vendure database in development and production environments.

## Table of Contents
- [Creating a Database Dump](#creating-a-database-dump)
- [Importing to Railway](#importing-to-railway)
- [Troubleshooting](#troubleshooting)
- [Environment Variables](#environment-variables)

## Creating a Database Dump

### Local Development Database Dump

```bash
# Install PostgreSQL client tools (if not already installed)
sudo apt-get update
sudo apt-get install postgresql-client-16  # Match this with your PostgreSQL server version

# Create a dump of the local database
pg_dump -h localhost -U need-it -d vendure -Fc -f vendure_backup.dump

# Or for a plain SQL dump (easier to inspect/modify)
pg_dump -h localhost -U need-it -d vendure -f vendure_backup.sql
```

### Important Notes
- Replace `need-it` with your local database username if different
- The `-Fc` flag creates a custom-format dump (smaller and faster for large databases)
- Plain SQL dumps are easier to inspect and modify if needed

## Importing to Railway

### Prerequisites
1. Create a new PostgreSQL database in Railway
2. Note the connection details (host, port, username, password)
3. Install PostgreSQL client tools if not already installed

### Import Process

```bash
# Connect to Railway's PostgreSQL
psql -h shinkansen.proxy.rlwy.net -p 46715 -U postgres -d vendure

# If the database doesn't exist, create it
CREATE DATABASE vendure;

# Exit psql (\q) and import the dump
# For custom format dump:
pg_restore -h shinkansen.proxy.rlwy.net -p 46715 -U postgres -d vendure vendure_backup.dump

# For plain SQL dump:
psql -h shinkansen.proxy.rlwy.net -p 46715 -U postgres -d vendure -f vendure_backup.sql
```

### Common Issues and Solutions

#### 1. Role "username" does not exist
Edit the SQL dump file to replace role ownership:
```bash
# Replace all instances of 'OWNER TO "need-it"' with 'OWNER TO "postgres"'
sed -i 's/OWNER TO "need-it"/OWNER TO "postgres"/g' vendure_backup.sql
```
!!!!!!!!KICSERELTUK A USERT posgres re !!!!!


#### 2. Database already contains data
Drop and recreate the database:
```sql
-- Connect to the default database
\c postgres

-- Drop and recreate the database
DROP DATABASE vendure;
CREATE DATABASE vendure;
```

## Environment Variables

### Local Development (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=need-it
DB_PASSWORD=your_local_password
DB_NAME=vendure
DB_SYNCHRONIZE=true  # Only for development!
NODE_ENV=development
```

### Production (Railway Environment Variables)
```
DB_HOST=shinkansen.proxy.rlwy.net
DB_PORT=46715
DB_USERNAME=postgres
DB_PASSWORD=your_railway_password
DB_NAME=vendure
DB_SYNCHRONIZE=false  # Always false in production
NODE_ENV=production
```

## Best Practices

1. **Always** back up your database before making structural changes
2. Never commit sensitive information to version control
3. Use `DB_SYNCHRONIZE=false` in production
4. For large databases, consider using `-Fc` format for faster dumps/restores
5. Test database restores in a staging environment before production

## Troubleshooting

### Connection Issues
- Verify your IP is whitelisted in Railway's network settings
- Check that the database is running and accessible
- Verify all connection details (host, port, username, password, database name)

### Performance Issues
- For large databases, consider using `pg_restore` with `-j` flag for parallel restoration
- Monitor database resources in the Railway dashboard
- Consider scheduling maintenance windows for large operations

### Data Consistency
- Always verify the integrity of your backups
- Consider using `--clean` with `pg_dump` to include DROP statements
- Test your backup and restore procedures regularly

      "_comment": "Helyi adatbázis beállítás: postgresql://need-it:zsolika@localhost:5432/vendure"