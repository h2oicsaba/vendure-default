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
const config = {
    ...baseConfig,
    apiOptions: {
        ...baseConfig.apiOptions,
        port: Number(port),
    },
    // Debug szintű naplózás Railway környezetben a problémák azonosításához
    logger: isRailway ? new DefaultLogger({ level: LogLevel.Debug }) : baseConfig.logger,
};

// Konfiguráció részleteinek kiírása
console.log(`Szerver port: ${config.apiOptions.port}`);
console.log(`Konfiguráció betöltése kész.`);

// Migrációk futtatása, majd a szerver indítása
runMigrations(config)
    .then(() => {
        console.log('Migrációk sikeresen lefutottak, szerver indítása...');
        return bootstrap(config);
    })
    .catch(err => {
        console.error('Hiba történt a szerver indításakor:', err);
    });
