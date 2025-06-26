import { bootstrap, runMigrations, DefaultLogger, LogLevel } from '@vendure/core';
import { config as baseConfig } from './vendure-config';

// Naplózás a környezet felismeréséről
console.log('Alkalmazás indítása...');

// Automatikus környezet felismerés (Railway vagy lokális)
const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_ID;
const environment = isRailway ? 'Railway' : 'Lokális';
console.log(`Környezet felismerve: ${environment}`);

// Port beállítása a környezet alapján
const port = process.env.PORT || 3000;
console.log(`Port: ${port}`);

// Konfiguráció beállítása a környezet alapján
let config = {
    ...baseConfig,
    apiOptions: {
        ...baseConfig.apiOptions,
        port: Number(port),
    },
    // Debug szintű naplózás Railway környezetben a problémák azonosításához
    logger: new DefaultLogger({ level: LogLevel.Debug }),
};

// Railway specifikus adatbázis beállítások
if (isRailway) {
    console.log('Railway adatbázis beállítások alkalmazása...');
    
    // Ha van DATABASE_URL, akkor azt használjuk
    if (process.env.DATABASE_URL) {
        console.log('DATABASE_URL környezeti változó találva, ennek használata...');
        config = {
            ...config,
            dbConnectionOptions: {
                type: 'postgres',
                url: process.env.DATABASE_URL,
                synchronize: false,
                logging: true,
                ssl: {
                    rejectUnauthorized: false
                }
            }
        };
    } 
    // Egyébként a Railway PostgreSQL változókat használjuk
    else if (process.env.DB_HOST && process.env.DB_USERNAME) {
        console.log('Railway PostgreSQL változók találva, ezek használata...');
        config = {
            ...config,
            dbConnectionOptions: {
                type: 'postgres',
                host: process.env.DB_HOST,
                port: Number(process.env.DB_PORT) || 5432,
                username: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                schema: process.env.DB_SCHEMA || 'public',
                synchronize: false,
                logging: true,
                ssl: {
                    rejectUnauthorized: false
                }
            }
        };
    }
}

// Konfiguráció részleteinek kiírása
console.log(`Szerver port: ${config.apiOptions.port}`);
console.log('Adatbázis beállítások:', JSON.stringify(config.dbConnectionOptions, null, 2));
console.log(`Konfiguráció betöltése kész.`);

// Migrációk futtatása, majd a szerver indítása
runMigrations(config)
    .then(() => {
        console.log('Migrációk sikeresen lefutottak, szerver indítása...');
        return bootstrap(config);
    })
    .catch(err => {
        console.error('Hiba történt a szerver indításakor:', err);
        console.error(err);
    });
