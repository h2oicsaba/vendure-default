# Vendure adatbázis kezelési útmutató

Ez az útmutató elmagyarázza, hogyan kezeld a Vendure adatbázis mentéseit és visszaállításait.

## 1. Adatbázis mentése

Helyi adatbázis mentése:
```bash
pg_dump -h localhost -p 5432 -U postgres -d vendure -F c -f vendure_dump.backup
```

Railway adatbázis mentése:
```bash
PGPASSWORD=iiTXwbZNrwJnJoXHJmHQBlkPZkCNkVvG pg_dump -h shinkansen.proxy.rlwy.net -p 46715 -U postgres -d vendure -f vendure_backup.sql
```

## 2. Adatbázis visszaállítása

Helyi adatbázis visszaállítása:
```bash
pg_restore -h localhost -p 5432 -U postgres -d vendure -c vendure_dump.backup
```

Railway adatbázis visszaállítása:
```bash
PGPASSWORD=iiTXwbZNrwJnJoXHJmHQBlkPZkCNkVvG psql -h shinkansen.proxy.rlwy.net -p 46715 -U postgres -d vendure -f vendure_backup.sql
```

## 3. Adatbázis törlése és újralétrehozása

Helyi adatbázis törlése:
```bash
dropdb -h localhost -p 5432 -U postgres vendure
createdb -h localhost -p 5432 -U postgres vendure
```

Railway adatbázis törlése szkripttel:
```bash
PGPASSWORD=iiTXwbZNrwJnJoXHJmHQBlkPZkCNkVvG psql -h shinkansen.proxy.rlwy.net -p 46715 -U postgres -d vendure -f /home/csaba/git/vendure-default/db_backups/01_vendure_delete.sql
```

A `01_vendure_delete.sql` szkript a következőket végzi el:
1. Megszakítja az összes aktív kapcsolatot az adatbázishoz
2. Törli az összes táblát, szekvenciát, nézetet, függvényt és típust
3. Visszaállítja a keresési útvonalat
4. Vacuum-ozza az adatbázist a hely felszabadításához

## 4. Szkriptek futtatása a Railway adatbázison

```bash
PGPASSWORD=iiTXwbZNrwJnJoXHJmHQBlkPZkCNkVvG psql -h shinkansen.proxy.rlwy.net -p 46715 -U postgres -d vendure -f /home/csaba/git/vendure-default/db_backups/szkript_neve.sql
```

## 5. Szkriptek futtatási sorrendje

A szkripteket a következő sorrendben kell futtatni:

1. 01_vendure_delete.sql - adatbázis törlése
2. 02_vendure_backup.sql - adatbázis visszaállítása
3. 03_vendure_personalization.sql - személyre szabás
4. 04_vendure_channels.sql - csatornák létrehozása és beállítása
5. 05_vendure_archive_channel.sql - archív csatorna beállítása
6. 06_vendure_languages.sql - nyelvek beállítása
7. 07_vendure_admin_ui_languages.sql - admin felület nyelveinek beállítása
8. 08_vendure_set_active_channel.sql - aktív csatorna beállítása
9. 09_vendure_product_translations.sql - termékfordítások
10. 10_vendure_check_channels.sql - csatornák ellenőrzése
