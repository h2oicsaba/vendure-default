import { bootstrap, runMigrations, DefaultLogger, LogLevel } from '@vendure/core';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { config as baseConfig } from './vendure-config';
import * as fs from 'fs';
import * as path from 'path';
import { HealthModule } from './health/health.module';

// Express rate-limit beállítások
process.env.TRUST_PROXY = '1'; // Számot használunk string formátumban
process.env.EXPRESS_DISABLE_RATE_LIMIT = 'true';

// Express beállítások - biztonságosabb megközelítés
try {
    // Csak importáljuk az express-t, de nem próbáljuk globálisan beállítani
    // A Vendure fogja létrehozni az Express alkalmazást
    const expressModule = require('express');
    console.log('Express modul betöltve');
    
    // Express Rate Limit explicit konfigurálás
    const rateLimit = require('express-rate-limit');
    if (rateLimit && typeof rateLimit.default === 'function') {
        // Modern express-rate-limit verzió
        console.log('express-rate-limit konfigurálása (modern verzió)');
        rateLimit.default.defaultOptions = { 
            ...rateLimit.default.defaultOptions,
            trustProxy: 1 // Számot használunk true helyett, következetesen
        };
    } else if (rateLimit) {
        // Régebbi express-rate-limit verzió
        console.log('express-rate-limit konfigurálása (régebbi verzió)');
        rateLimit.defaults = { 
            ...rateLimit.defaults,
            trustProxy: 1 // Számot használunk true helyett, következetesen
        };
    }
} catch (e: any) {
    console.log('Express vagy express-rate-limit modul nem található vagy nem konfigurálható:', e?.message || 'Ismeretlen hiba');
}

// Naplózás a környezet felismeréséről
console.log('Alkalmazás indítása...');
console.log('Aktuális könyvtár:', process.cwd());
console.log('Környezeti változók:', Object.keys(process.env).join(', '));

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
        // Explicit cors beállítások
        cors: {
            origin: true,
            credentials: true,
        },
        // Trust proxy beállítás - több helyen is beállítjuk a biztonság kedvéért
        middleware: [
            // HTTPS átirányítás middleware
            {
                handler: (req: any, res: any, next: any) => {
                    // HTTPS átirányítás Railway környezetben
                    if (isRailway && req.headers['x-forwarded-proto'] === 'http') {
                        console.log('HTTP kérés átirányítása HTTPS-re');
                        return res.redirect(`https://${req.headers.host}${req.url}`);
                    }
                    next();
                },
                route: '',
            },
            // Eredeti middleware
            {
                handler: (req: any, res: any, next: any) => {
                    // Set trust proxy for express-rate-limit
                    if (req.app && typeof req.app.set === 'function') {
                        // Railway és más cloud környezetekben a proxy beállítás szükséges
                        req.app.set('trust proxy', 1);
                        
                        // Express Rate Limit problémák elkerülése
                        if (req.app.disable) {
                            req.app.disable('rate limit');
                        }
                    }
                    // Proxy fejlécek ellenőrzése és naplózása
                    if (req.headers && req.headers['x-forwarded-for']) {
                        console.log(`X-Forwarded-For: ${req.headers['x-forwarded-for']}`);
                    }
                    console.log(`Kérés érkezett: ${req.method} ${req.path}`);
                    next();
                },
                route: '',
            }
        ],
        // Express Rate Limit beállítások már konfigurálva fentebb
    },
    // Trace szintű naplózás a problémák azonosításához
    logger: new DefaultLogger({ level: LogLevel.Verbose }),
    // Health module regisztrálása
    nestModules: [HealthModule],
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
                type: 'postgres' as const,
                url: process.env.DATABASE_URL,
                synchronize: false,
                logging: true,
                extra: {
                    ssl: {
                        rejectUnauthorized: false
                    }
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
                type: 'postgres' as const,
                host: process.env.DB_HOST,
                port: Number(process.env.DB_PORT) || 5432,
                username: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                schema: process.env.DB_SCHEMA || 'public',
                synchronize: false,
                logging: true,
                extra: {
                    ssl: {
                        rejectUnauthorized: false
                    }
                }
            }
        };
    }
}

// Admin UI plugin konfigurációjának ellenőrzése
const adminUiPlugin = config.plugins?.find(plugin => plugin instanceof AdminUiPlugin);
if (adminUiPlugin) {
    console.log('AdminUiPlugin találva a konfigurációban');
    console.log('AdminUI route:', (adminUiPlugin as any).options?.route);
    console.log('AdminUI port:', (adminUiPlugin as any).options?.port);
} else {
    console.log('AdminUiPlugin NEM található a konfigurációban!');
}

// Konfiguráció részleteinek kiírása
console.log(`Szerver port: ${config.apiOptions.port}`);
console.log('Adatbázis beállítások:', JSON.stringify(config.dbConnectionOptions, null, 2));
console.log(`Konfiguráció betöltése kész.`);

// Dist könyvtár ellenőrzése
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
    console.log('dist könyvtár létezik');
    try {
        const files = fs.readdirSync(distPath);
        console.log('dist könyvtár tartalma:', files.join(', '));
    } catch (err) {
        console.error('Hiba a dist könyvtár olvasásakor:', err);
    }
} else {
    console.error('dist könyvtár NEM létezik!');
}

// Migrációk futtatása, majd a szerver indítása
console.log('Migrációk futtatása...');
runMigrations(config)
    .then(() => {
        console.log('Migrációk sikeresen lefutottak, szerver indítása...');
        return bootstrap(config);
    })
    .then(app => {
        console.log('Szerver sikeresen elindult!');
        console.log(`Szerver elérhető: http://localhost:${config.apiOptions.port}`);
        console.log(`Admin UI elérhető: http://localhost:${config.apiOptions.port}/admin`);
        return app;
    })
    .catch(err => {
        console.error('Hiba történt a szerver indításakor:');
        console.error(err);
    });
