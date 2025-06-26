import { bootstrap, runMigrations, DefaultLogger, LogLevel } from '@vendure/core';
import { config as baseConfig } from './vendure-config';

console.log('Railway konfiguráció betöltése...');

// A Railway automatikusan biztosít egy PORT környezeti változót
const railwayPort = process.env.PORT || 3000;
console.log(`Railway PORT: ${railwayPort}`);

// Railway specifikus konfiguráció
const railwayConfig = {
    ...baseConfig,
    apiOptions: {
        ...baseConfig.apiOptions,
        port: Number(railwayPort),
    },
    logger: new DefaultLogger({ level: LogLevel.Debug }), // Debug szintű naplózás a problémák azonosításához
};

// Explicit módon kiírjuk a konfigurációt
console.log(`Server port: ${railwayConfig.apiOptions.port}`);
console.log(`Admin UI port: ${railwayConfig.apiOptions.port}`);
console.log('Railway konfiguráció betöltése kész.');

// Indítjuk a migrációkat, majd a szervert
runMigrations(railwayConfig)
    .then(() => {
        console.log('Migrációk sikeresen lefutottak, szerver indítása...');
        return bootstrap(railwayConfig);
    })
    .catch(err => {
        console.error('Hiba történt a szerver indításakor:', err);
    });