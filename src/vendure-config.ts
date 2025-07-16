// src/vendure-config.ts

import 'dotenv/config'; // Fontos, hogy ez legyen az ELSŐ import, hogy a .env változók betöltődjenek

// Ellenőrizzük, hogy worker módban fut-e az alkalmazás
// Elsősorban a WORKER_MODE környezeti változót használjuk
const isWorkerMode = process.env.WORKER_MODE === 'true';

// Debug log a worker mód felismeréséről
console.log('Worker mode detection:', {
    isWorkerMode,
    workerModeEnv: process.env.WORKER_MODE,
    filename: process.argv[1]
});

// Email küldés részletes naplózása
const logEmailDetails = () => {
    console.log('Email küldés részletes naplózása aktiválva');
    // Monkey patch a nodemailer createTransport függvényét
    try {
        const nodemailer = require('nodemailer');
        const originalCreateTransport = nodemailer.createTransport;
        // @ts-ignore - Ignoráljuk a típushibákat a monkey patch-nél
        nodemailer.createTransport = function(options: any) {
            console.log('Nodemailer transport létrehozva:', JSON.stringify(options, null, 2));
            const transport = originalCreateTransport.apply(this, arguments);
            const originalSendMail = transport.sendMail;
            // @ts-ignore - Ignoráljuk a típushibákat a monkey patch-nél
            transport.sendMail = function(mailOptions: any, callback: any) {
                console.log('Email küldési kísérlet:', {
                    to: mailOptions.to,
                    from: mailOptions.from,
                    subject: mailOptions.subject,
                    text: mailOptions.text ? mailOptions.text.substring(0, 100) + '...' : undefined,
                    html: mailOptions.html ? 'HTML tartalom (nem mutatjuk)' : undefined
                });
                // @ts-ignore - Ignoráljuk a típushibákat a monkey patch-nél
                return originalSendMail.call(this, mailOptions, function(err: any, info: any) {
                    if (err) {
                        console.error('Email küldési hiba:', err);
                    } else {
                        console.log('Email sikeresen elküldve:', info);
                    }
                    if (callback) {
                        callback(err, info);
                    }
                });
            };
            return transport;
        };
        console.log('Nodemailer monkey patch sikeresen alkalmazva');
    } catch (error: any) {
        console.error('Hiba a nodemailer monkey patch során:', error);
    }
};

// Minden módban aktiváljuk az email naplózást, mivel worker módban is szükség van rá
// Az email küldés a worker feladata, ezért ott is naplóznunk kell
logEmailDetails();

// Worker módban is szükség van az EmailPlugin-re, mivel az email küldés a worker feladata
// A worker módban is inicializáljuk a szükséges plugineket
import path from 'path';
import { Application } from 'express';

import {
    DefaultAssetNamingStrategy,
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSearchPlugin,
    LanguageCode,
    VendureConfig,
    bootstrap,
    bootstrapWorker,
    runMigrations,
    DefaultLogger,
    LogLevel,
    EventBus
} from '@vendure/core';
// Az ElasticsearchPlugin nincs telepítve, ezért használjuk a DefaultSearchPlugin-t
import { BullMQJobQueuePlugin } from '@vendure/job-queue-plugin/package/bullmq';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';

// Importáljuk a saját S3 asset storage stratégiánkat
import { S3AssetStorageStrategy } from './plugins/s3_assets/s3-asset-storage-strategy';

// Importáljuk a saját csatorna szűrő plugint
import { ChannelFilterPlugin } from './plugins/channel-filter';

// ----------------------------------------------------

// Konfigurációs választók a környezeti változókból
const IS_DEV = process.env.APP_ENV === 'dev';
// Plugin választók - értékük lehet "default" vagy "advanced"
const USE_ADVANCED_ASSETS = process.env.USE_ASSET_STORAGE === 'advanced';
const USE_ADVANCED_JOB_QUEUE = process.env.USE_JOB_QUEUE === 'advanced';
const USE_ADVANCED_SEARCH = process.env.USE_SEARCH === 'advanced';

// Worker módban ellenőrizzük, hogy a USE_JOB_QUEUE 'advanced' értékre van-e állítva
if (isWorkerMode && !USE_ADVANCED_JOB_QUEUE) {
    console.error('HIBA: A worker módban a USE_JOB_QUEUE környezeti változónak "advanced" értékre kell állítva lennie!');
    console.error('A worker nem tud elindulni az InMemoryJobQueueStrategy-vel, csak a BullMQJobQueuePlugin-nel.');
    console.error('Kérlek állítsd be a USE_JOB_QUEUE=advanced környezeti változót a worker szolgáltatásban.');
    process.exit(1);
}

// Ellenőrizzük, hogy használunk-e worker szolgáltatást
const useWorker = process.env.USE_WORKER === 'true';

// Ha használunk worker szolgáltatást, akkor a fő szerveren is a BullMQJobQueuePlugin-t kell használni
if (!isWorkerMode && useWorker && !USE_ADVANCED_JOB_QUEUE) {
    console.error('HIBA: Ha worker szolgáltatást használsz (USE_WORKER=true), akkor a fő szerveren is a BullMQJobQueuePlugin-t kell használni!');
    console.error('Kérlek állítsd be a USE_JOB_QUEUE=advanced környezeti változót a fő szerver szolgáltatásban is.');
    process.exit(1);
}

// Redis kapcsolati adatok - Railway által biztosított környezeti változókat használjuk
// Először ellenőrizzük, hogy van-e REDIS_URL, ha nincs, akkor a különálló változókat használjuk

// Alapbeállítások inicializálása
let redisHost = '';
let redisPort = 6379;
let redisPassword: string | undefined;
let redisUsername: string | undefined;

// Ellenőrizzük, hogy van-e REDIS_URL
const useRedisUrl = !!process.env.REDIS_URL;

if (useRedisUrl) {
    try {
        // Kinyerjük a Redis URL-ből a kapcsolati paramétereket
        console.log('Redis URL feldolgozása:', process.env.REDIS_URL);
        
        // Redis URL formátum: redis://username:password@host:port
        const redisUrl = new URL(process.env.REDIS_URL!);
        
        // Kinyerjük a host, port, username, password értékeket
        redisHost = redisUrl.hostname;
        redisPort = parseInt(redisUrl.port || '6379', 10);
        
        // Felhasználónév és jelszó kinyerjése
        if (redisUrl.username) {
            redisUsername = redisUrl.username;
        }
        
        if (redisUrl.password) {
            redisPassword = redisUrl.password;
        }
        
        console.log('Redis kapcsolati paraméterek kinyerve az URL-ből:', {
            host: redisHost,
            port: redisPort,
            username: redisUsername ? '***' : undefined,
            password: redisPassword ? '***' : undefined
        });
    } catch (error) {
        console.error('Hiba a Redis URL feldolgozása során:', error);
        throw new Error('Hiba a Redis URL feldolgozása során: ' + (error instanceof Error ? error.message : String(error)));
    }
} else {
    // Ha nincs REDIS_URL, akkor a különálló változókat használjuk
    if ((isWorkerMode || USE_ADVANCED_JOB_QUEUE) && !process.env.REDISHOST) {
        throw new Error('REDISHOST környezeti változó nincs beállítva! A Redis kapcsolathoz szükséges.');
    }
    if ((isWorkerMode || USE_ADVANCED_JOB_QUEUE) && !process.env.REDISPORT) {
        throw new Error('REDISPORT környezeti változó nincs beállítva! A Redis kapcsolathoz szükséges.');
    }
    redisHost = process.env.REDISHOST!;
    redisPort = +process.env.REDISPORT!;
    redisPassword = process.env.REDISPASSWORD;
    redisUsername = process.env.REDISUSER;
}

// PORT környezeti változó ellenőrzése - hiba, ha nincs beállítva
if (!process.env.PORT) {
    throw new Error('PORT környezeti változó nincs beállítva!');
}
const serverPort = +process.env.PORT; // Használjuk a .env-ből érkező PORT-ot



export const config: VendureConfig = {
    apiOptions: {
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        // A 'trust proxy' beállítás hozzáadása

        // Ezek a debug opciók IS_DEV alapján kapcsolódnak be/ki
        ...(IS_DEV ? {
            adminApiDebug: true,
            shopApiDebug: true,
        } : {}),
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
          secret: process.env.COOKIE_SECRET,
          // Production-safe cookie beállítások
          secure: !IS_DEV,
          sameSite: 'strict',
        },
    },
    dbConnectionOptions: {
        type: 'postgres', // Maradhat 'postgres'
        // FIGYELEM: synchronize: true CSAK fejlesztésre!
        // Éles környezetben (Railway) ez FALSE legyen, és a migrációkat futtasd manuálisan.
        synchronize: IS_DEV ? true : false, // Fejlesztésen auto-sync, produkcióban migrációk
        migrations: [path.join(__dirname, './migrations/*.+(js|ts)')], // Migrációk elérési útja
        logging: false, // Ezt be lehet kapcsolni ('all' vagy ['query', 'schema']) ha hibakeresés van
        database: process.env.DB_NAME,
        schema: process.env.DB_SCHEMA,
        host: process.env.DB_HOST,
        port: +process.env.DB_PORT!, // A '!' jel jelzi, hogy biztosan szám lesz
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
    },
    paymentOptions: {
        paymentMethodHandlers: [dummyPaymentHandler],
    },
    customFields: {}, // Ha nincsenek egyéni mezők, akkor üresen hagyjuk
    
    plugins: isWorkerMode ? [
        // Worker módban csak a szükséges plugineket inicializáljuk
        
        // Worker módban mindig a BullMQJobQueuePlugin-t használjuk
        // Az InMemoryJobQueueStrategy nem működik worker módban
        BullMQJobQueuePlugin.init({
            // A BullMQJobQueuePlugin a bullmq csomagon alapul
            // Explicit módon adjuk meg a kapcsolati paramétereket a problémák elkerülése érdekében
            connection: {
                host: redisHost,
                port: redisPort,
                username: redisUsername,
                password: redisPassword,
                family: 0, // IPv4/IPv6 kompatibilitás
                enableOfflineQueue: false, // Hiba esetén ne próbálkozzon újra
                maxRetriesPerRequest: null, // BullMQ megköveteli, hogy ez null legyen
                connectTimeout: 10000, // 10 másodperc kapcsolódási időtúllépés
                enableReadyCheck: true, // Ellenőrizze, hogy a Redis szerver kész-e
            }
        }),
            
        // DefaultSearchPlugin szükséges a keresési index frissítéséhez
        DefaultSearchPlugin,
        
        // EmailPlugin szükséges, mivel az email küldés a worker feladata
        EmailPlugin.init({
            devMode: process.env.USE_EMAIL !== 'advanced' ? true : false as true,
            outputPath: path.join(__dirname, '../static/email/test-emails'),
            route: 'mailbox',
            handlers: defaultEmailHandlers,
            templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
            transport: process.env.USE_EMAIL === 'advanced' 
                ? (() => {
                    // Ellenőrizzük, hogy minden szükséges környezeti változó be van-e állítva
                    if (!process.env.EMAIL_SMTP_HOST) {
                        throw new Error('EMAIL_SMTP_HOST környezeti változó nincs beállítva!');
                    }
                    if (!process.env.EMAIL_SMTP_USER) {
                        throw new Error('EMAIL_SMTP_USER környezeti változó nincs beállítva!');
                    }
                    if (!process.env.EMAIL_SMTP_PASS) {
                        throw new Error('EMAIL_SMTP_PASS környezeti változó nincs beállítva!');
                    }
                    
                    // Részletes naplózás az email küldés előtt
                    console.log('Worker: Email küldés konfiguráció:', {
                        host: process.env.EMAIL_SMTP_HOST,
                        port: Number(process.env.EMAIL_SMTP_PORT) || 587,
                        user: process.env.EMAIL_SMTP_USER,
                        secure: process.env.EMAIL_SMTP_SECURE === 'true',
                        fromAddress: process.env.EMAIL_FROM_ADDRESS
                    });
                    
                    return {
                        type: 'smtp',
                        host: process.env.EMAIL_SMTP_HOST,
                        port: Number(process.env.EMAIL_SMTP_PORT) || 587,
                        auth: {
                            user: process.env.EMAIL_SMTP_USER,
                            pass: process.env.EMAIL_SMTP_PASS,
                        },
                        secure: process.env.EMAIL_SMTP_SECURE === 'true',
                        requireTLS: true, // STARTTLS használata
                        tls: {
                            rejectUnauthorized: false // SSL/TLS problémák esetén
                        },
                        debug: true, // Debug mód bekapcsolása
                        logger: true, // Logger bekapcsolása
                    };
                })()
                : {
                    type: 'none', // Egyébként nem küld emailt, csak naplózza
                  },
            globalTemplateVars: {
                // Csak az egyszerű email címet használjuk, nem a formázott címet
                fromAddress: (() => {
                    const emailAddress = process.env.EMAIL_FROM_ADDRESS || '';
                    // Ha formázott cím (tartalmaz < > karaktereket), akkor kinyerjük az email címet
                    const match = emailAddress.match(/<([^>]+)>/);
                    if (match && match[1]) {
                        console.log('Worker: Formázott email cím átalakítása egyszerű címmé:', emailAddress, '->', match[1]);
                        return match[1]; // Visszaadjuk csak az email címet
                    }
                    // Ha nincs beállítva vagy üres, hibát dobunk
                    if (!emailAddress) {
                        throw new Error('EMAIL_FROM_ADDRESS környezeti változó nincs beállítva!');
                    }
                    return emailAddress; // Ha nem formázott cím, akkor visszaadjuk változatlanul
                })(),
                verifyEmailAddressUrl: process.env.VERIFY_EMAIL_URL || (() => { throw new Error('VERIFY_EMAIL_URL környezeti változó nincs beállítva!'); })(),
                passwordResetUrl: process.env.PASSWORD_RESET_URL || (() => { throw new Error('PASSWORD_RESET_URL környezeti változó nincs beállítva!'); })(),
                changeEmailAddressUrl: process.env.CHANGE_EMAIL_URL || (() => { throw new Error('CHANGE_EMAIL_URL környezeti változó nincs beállítva!'); })(),
            },
        }),
    ] : [
        // Normál módban az összes plugint inicializáljuk
        
        // Saját csatorna szűrő plugin, ami megakadályozza az alapértelmezett csatornára való visszaesést
        ChannelFilterPlugin,
        GraphiqlPlugin.init(),
        
        // Search plugin hozzáadása a normál módhoz is
        DefaultSearchPlugin,
        
        // Asset Server Plugin konfigurációja - különböző storage stratégiával a környezeti változók alapján
        AssetServerPlugin.init({
            // @ts-ignore - Az AssetServerPlugin típushibáját figyelmen kívül hagyjuk
            route: 'assets',
            assetUploadDir: path.join(__dirname, '../static/assets'),
            // Ha advanced asset kezelést használunk, akkor S3 storage stratégiát konfigurálunk
            ...(USE_ADVANCED_ASSETS ? {
                storageStrategyFactory: () => {
                    // Ellenőrizzük, hogy a szükséges környezeti változók be vannak-e állítva
                    if (!process.env.S3_BUCKET) {
                        throw new Error('S3_BUCKET környezeti változó nincs beállítva!');
                    }
                    if (!process.env.S3_ACCESS_KEY_ID) {
                        throw new Error('S3_ACCESS_KEY_ID környezeti változó nincs beállítva!');
                    }
                    if (!process.env.S3_SECRET_ACCESS_KEY) {
                        throw new Error('S3_SECRET_ACCESS_KEY környezeti változó nincs beállítva!');
                    }
                    
                    return new S3AssetStorageStrategy({
                        bucket: process.env.S3_BUCKET,
                        credentials: {
                            accessKeyId: process.env.S3_ACCESS_KEY_ID,
                            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
                        },
                        endpoint: process.env.S3_ENDPOINT,
                        region: process.env.S3_REGION,
                        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
                        assetUrlPrefix: process.env.ASSET_URL_PREFIX
                    });
                },
                // Az assetUrlPrefix beállítása környezeti változóból - ez fogja meghatározni, hogy a frontend honnan tölti le a képeket
                assetUrlPrefix: process.env.ASSET_URL_PREFIX,
            } : {}),
        }),
        
        // A DefaultSchedulerPlugin nincs telepítve, ezért kikommentezzük
        // DefaultSchedulerPlugin.init(),

        // Job Queue plugin kiválasztása a környezeti változó alapján
        // Ha a worker módban advanced-et használunk, akkor itt is azt kell használnunk
        ...(USE_ADVANCED_JOB_QUEUE ? [
            BullMQJobQueuePlugin.init({
                // A BullMQJobQueuePlugin a bullmq csomagon alapul
                // Explicit módon adjuk meg a kapcsolati paramétereket a problémák elkerülése érdekében
                connection: {
                    host: redisHost,
                    port: redisPort,
                    username: redisUsername,
                    password: redisPassword,
                    family: 0, // IPv4/IPv6 kompatibilitás
                    enableOfflineQueue: false, // Hiba esetén ne próbálkozzon újra
                    maxRetriesPerRequest: null, // BullMQ megköveteli, hogy ez null legyen
                    connectTimeout: 10000, // 10 másodperc kapcsolódási időtúllépés
                    enableReadyCheck: true, // Ellenőrizze, hogy a Redis szerver kész-e
                }
            }),
        ] : [
            DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
        ]),
            
        // Itt volt korábban a VPS asset pluginek konfigurációja, de eltávolítottuk

        // Email küldés részletes naplózása
        console.log('Email küldés részletes naplózása aktiválva');
        
        EmailPlugin.init({
            devMode: process.env.USE_EMAIL !== 'advanced' ? true : false as true, // Ha nem advanced, akkor devMode
            outputPath: path.join(__dirname, '../static/email/test-emails'),
            route: 'mailbox',
            handlers: defaultEmailHandlers,
            templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
            transport: process.env.USE_EMAIL === 'advanced' 
                ? (() => {
                    // Ellenőrizzük, hogy minden szükséges környezeti változó be van-e állítva
                    if (!process.env.EMAIL_SMTP_HOST) {
                        throw new Error('EMAIL_SMTP_HOST környezeti változó nincs beállítva!');
                    }
                    if (!process.env.EMAIL_SMTP_USER) {
                        throw new Error('EMAIL_SMTP_USER környezeti változó nincs beállítva!');
                    }
                    if (!process.env.EMAIL_SMTP_PASS) {
                        throw new Error('EMAIL_SMTP_PASS környezeti változó nincs beállítva!');
                    }
                    
                    // Részletes naplózás az email küldés előtt
                    console.log('Email küldés konfiguráció:', {
                        host: process.env.EMAIL_SMTP_HOST,
                        port: Number(process.env.EMAIL_SMTP_PORT) || 587,
                        user: process.env.EMAIL_SMTP_USER,
                        secure: process.env.EMAIL_SMTP_SECURE === 'true',
                        fromAddress: process.env.EMAIL_FROM_ADDRESS
                    });
                    
                    // Teszteljük az SMTP kapcsolatot
                    try {
                        const nodemailer = require('nodemailer');
                        const testTransport = nodemailer.createTransport({
                            host: process.env.EMAIL_SMTP_HOST,
                            port: Number(process.env.EMAIL_SMTP_PORT) || 587,
                            secure: process.env.EMAIL_SMTP_SECURE === 'true',
                            auth: {
                                user: process.env.EMAIL_SMTP_USER,
                                pass: process.env.EMAIL_SMTP_PASS,
                            },
                            debug: true,
                            logger: true
                        });
                        
                        console.log('SMTP kapcsolat tesztelése...');
                        // @ts-ignore - Ignoráljuk a típushibákat a verify függvénynél
                        testTransport.verify(function(error: any, success: any) {
                            if (error) {
                                console.error('SMTP kapcsolat hiba:', error);
                            } else {
                                console.log('SMTP szerver kész az emailek fogadására:', success);
                            }
                        });
                    } catch (error: any) {
                        console.error('Hiba az SMTP kapcsolat tesztelése során:', error);
                    }
                    
                    return {
                        type: 'smtp', // Ha advanced, akkor SMTP
                        host: process.env.EMAIL_SMTP_HOST,
                        port: Number(process.env.EMAIL_SMTP_PORT) || 587,
                        auth: {
                            user: process.env.EMAIL_SMTP_USER,
                            pass: process.env.EMAIL_SMTP_PASS,
                        },
                        secure: process.env.EMAIL_SMTP_SECURE === 'true',
                        requireTLS: true, // STARTTLS használata, mint a Python példában
                        tls: {
                            rejectUnauthorized: false // Ha SSL/TLS problémák lennének
                        },
                        debug: true, // Debug mód bekapcsolása
                        logger: true, // Logger bekapcsolása
                    };
                })()
                : {
                    type: 'none', // Egyébként nem küld emailt, csak naplózza
                  },
            globalTemplateVars: {
                // Csak az egyszerű email címet használjuk, nem a formázott címet
                // Ha formázott cím van (pl. "Vendure Store" <noreply@need-shit.fun>), akkor kinyerjük belőle az email címet
                fromAddress: (() => {
                    const emailAddress = process.env.EMAIL_FROM_ADDRESS || '';
                    // Ha formázott cím (tartalmaz < > karaktereket), akkor kinyerjük az email címet
                    const match = emailAddress.match(/<([^>]+)>/);
                    if (match && match[1]) {
                        console.log('Formázott email cím átalakítása egyszerű címmé:', emailAddress, '->', match[1]);
                        return match[1]; // Visszaadjuk csak az email címet
                    }
                    // Ha nincs beállítva vagy üres, hibát dobunk
                    if (!emailAddress) {
                        throw new Error('EMAIL_FROM_ADDRESS környezeti változó nincs beállítva!');
                    }
                    return emailAddress; // Ha nem formázott cím, akkor visszaadjuk változatlanul
                })(),
                verifyEmailAddressUrl: process.env.VERIFY_EMAIL_URL || (() => { throw new Error('VERIFY_EMAIL_URL környezeti változó nincs beállítva!'); })(),
                passwordResetUrl: process.env.PASSWORD_RESET_URL || (() => { throw new Error('PASSWORD_RESET_URL környezeti változó nincs beállítva!'); })(),
                changeEmailAddressUrl: process.env.CHANGE_EMAIL_URL || (() => { throw new Error('CHANGE_EMAIL_URL környezeti változó nincs beállítva!'); })(),
            },
        }),
        
        AdminUiPlugin.init({
            route: 'admin',
            port: serverPort,
            adminUiConfig: {
                apiHost: IS_DEV ? `http://localhost:${serverPort}` : (() => {
                    if (isWorkerMode) {
                        // Worker módban dummy értéket használunk
                        return 'http://worker-mode-host';
                    }
                    if (!process.env.PUBLIC_HOST_URL) {
                        throw new Error('A PUBLIC_HOST_URL környezeti változót be kell állítani éles környezetben!');
                    }
                    return process.env.PUBLIC_HOST_URL;
                })(),
                // Megjegyzés: A jelenlegi Vendure verzió nem támogatja az availableLocales beállítást
                // Ha frissíted a Vendure verziót, akkor így állíthatnád be:
                // app: {
                //     availableLocales: ['hu-HU', 'sk-SK'],
                // }
            },
        }),
    ],
};
