import { bootstrap, runMigrations, VendureConfig, DefaultLogger, LogLevel } from '@vendure/core';
import { config as baseConfig } from './vendure-config';

// Railway specifikus konfiguráció
console.log('Railway konfiguráció betöltése...');

// A Railway automatikusan biztosít egy PORT környezeti változót
const railwayPort = process.env.PORT || 3000;
console.log(`Railway PORT: ${railwayPort}`);

// Railway specifikus konfiguráció
const railwayConfig: VendureConfig = {
    ...baseConfig,
    apiOptions: {
        ...baseConfig.apiOptions,
        port: Number(railwayPort),
    },
    logger: new DefaultLogger({ level: LogLevel.Info }),
    dbConnectionOptions: {
        type: 'postgres',
        url: process.env.DATABASE_URL,
        synchronize: false,
        logging: false,
        ssl: true
    }
};

console.log('Railway konfiguráció betöltése kész.');

// Indítjuk a migrációkat, majd a szervert
runMigrations(railwayConfig)
    .then(() => bootstrap(railwayConfig))
    .catch(err => {
        console.error('Hiba történt a szerver indításakor:', err);
    });