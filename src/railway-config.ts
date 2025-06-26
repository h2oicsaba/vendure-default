// src/railway-config.ts

import 'dotenv/config';
import path from 'path';
import { config as baseConfig } from './vendure-config';
import { ConnectionOptions } from 'typeorm';
import { LogLevel } from '@vendure/core';

console.log('Railway konfiguráció betöltése...');

// Railway specifikus konfiguráció
// A Railway automatikusan biztosít egy DATABASE_URL és PORT környezeti változót
const databaseUrl = process.env.DATABASE_URL;
const railwayPort = process.env.PORT || 3000;

console.log(`Railway PORT: ${railwayPort}`);

// Frissítjük a port beállítást
baseConfig.apiOptions = {
    ...baseConfig.apiOptions,
    port: Number(railwayPort),
};

console.log('API port beállítva: ' + railwayPort);

if (databaseUrl) {
    console.log('DATABASE_URL megtalálva, adatbázis konfiguráció frissítése...');
    
    // Ha van DATABASE_URL, akkor azt használjuk a kapcsolódáshoz
    const dbConfig: ConnectionOptions = {
        type: 'postgres',
        url: databaseUrl,
        synchronize: false,
        logging: true, // Bekapcsoljuk az adatbázis naplózást
        ssl: {
            rejectUnauthorized: false // Railway esetén szükséges
        }
    };

    // Frissítjük az adatbázis konfigurációt
    baseConfig.dbConnectionOptions = {
        ...baseConfig.dbConnectionOptions,
        ...dbConfig
    };
    
    console.log('Adatbázis konfiguráció frissítve.');
} else {
    console.error('DATABASE_URL környezeti változó nem található!');
}

// Beállítjuk a naplózási szintet részletesebbre
baseConfig.logger = {
    debug: () => {}, // Dummy implementációk a VendureLogger interfészhez
    error: console.error,
    info: console.info,
    verbose: console.log,
    warn: console.warn
};

console.log('Railway konfiguráció betöltése kész.');

export const config = baseConfig;