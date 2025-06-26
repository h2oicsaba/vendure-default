import { bootstrap, runMigrations } from '@vendure/core';
import { config } from './vendure-config';

console.log('Railway konfiguráció betöltése...');

// A Railway automatikusan biztosít egy PORT környezeti változót
// De ezt már kezeli a vendure-config.ts

// A Railway-en a környezeti változók már be vannak állítva:
// DB_HOST=postgres
// DB_PORT=5432
// DB_NAME=railway
// DB_USERNAME=postgres
// DB_PASSWORD=postgres
// DB_SCHEMA=public

// Ezeket a vendure-config.ts már megfelelően kezeli

console.log('Railway konfiguráció betöltése kész.');

// Indítjuk a migrációkat, majd a szervert
runMigrations(config)
    .then(() => bootstrap(config))
    .catch(err => {
        console.error('Hiba történt a szerver indításakor:', err);
    });