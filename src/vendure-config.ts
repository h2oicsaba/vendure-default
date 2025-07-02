// src/vendure-config.ts

import 'dotenv/config'; // Fontos, hogy ez legyen az ELSŐ import, hogy a .env változók betöltődjenek
import path from 'path';
import { Application } from 'express';

import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSearchPlugin,
    VendureConfig
} from '@vendure/core';
// Az ElasticsearchPlugin nincs telepítve, ezért használjuk a DefaultSearchPlugin-t
import { BullMQJobQueuePlugin } from '@vendure/job-queue-plugin/package/bullmq';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';

// Importáljuk a saját S3 asset storage stratégiánkat
import { S3AssetStorageStrategy } from './plugins/s3_assets/s3-asset-storage-strategy';

// ----------------------------------------------------

// Konfigurációs választók a környezeti változókból
const IS_DEV = process.env.APP_ENV === 'dev';
const USE_ASSET_STORAGE = process.env.USE_ASSET_STORAGE || 'default';
const USE_ADVANCED_ASSETS = USE_ASSET_STORAGE === 'advanced';
const USE_ADVANCED_JOB_QUEUE = process.env.USE_JOB_QUEUE === 'advanced';
const USE_ADVANCED_SEARCH = process.env.USE_SEARCH === 'advanced';
const serverPort = +process.env.PORT! || 3000; // Használjuk a .env-ből érkező PORT-ot

export const config: VendureConfig = {
    apiOptions: {
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        // A 'trust proxy' beállítás hozzáadása
        app: (app: Application) => {
            app.set('trust proxy', 2 );
        },
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
    
    plugins: [
        GraphiqlPlugin.init(),
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
                            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
                        },
                        endpoint: process.env.S3_ENDPOINT,
                        region: process.env.S3_REGION,
                        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
                        assetUrlPrefix: process.env.ASSET_URL_PREFIX,
                    });
                },
                // Az assetUrlPrefix beállítása környezeti változóból - ez fogja meghatározni, hogy a frontend honnan tölti le a képeket
                assetUrlPrefix: process.env.ASSET_URL_PREFIX,
            } : {}),
        }),
        // A DefaultSchedulerPlugin nincs telepítve, ezért kikommentezzük
        // DefaultSchedulerPlugin.init(),

        // Job Queue plugin kiválasztása a környezeti változó alapján
        ...(USE_ADVANCED_JOB_QUEUE ? [
            BullMQJobQueuePlugin.init({
                connection: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: +(process.env.REDIS_PORT || 6379),
                }
            })
        ] : []),
            
        // Search plugin kiválasztása a környezeti változó alapján
        // Az ElasticsearchPlugin nincs telepítve, ezért mindig a DefaultSearchPlugin-t használjuk
        DefaultSearchPlugin,
            
        // Itt volt korábban a VPS asset pluginek konfigurációja, de eltávolítottuk

        EmailPlugin.init({
            devMode: process.env.USE_EMAIL !== 'advanced' ? true : false as true, // Ha nem advanced, akkor devMode
            outputPath: path.join(__dirname, '../static/email/test-emails'),
            route: 'mailbox',
            handlers: defaultEmailHandlers,
            templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
            transport: process.env.USE_EMAIL === 'advanced' 
                ? {
                    type: 'smtp', // Ha advanced, akkor SMTP
                    host: process.env.EMAIL_SMTP_HOST,
                    port: Number(process.env.EMAIL_SMTP_PORT) || 587,
                    auth: {
                        user: process.env.EMAIL_SMTP_USER,
                        pass: process.env.EMAIL_SMTP_PASS,
                    },
                    secure: process.env.EMAIL_SMTP_SECURE === 'true',
                  }
                : {
                    type: 'none', // Egyébként nem küld emailt, csak naplózza
                  },
            globalTemplateVars: {
                fromAddress: process.env.EMAIL_FROM_ADDRESS || (() => { throw new Error('EMAIL_FROM_ADDRESS környezeti változó nincs beállítva!'); })(),
                // Email URL-ek - hibát dobnak, ha nincsenek beállítva
                verifyEmailAddressUrl: process.env.VERIFY_EMAIL_URL || (() => { throw new Error('VERIFY_EMAIL_URL környezeti változó nincs beállítva!'); })(), 
                passwordResetUrl: process.env.PASSWORD_RESET_URL || (() => { throw new Error('PASSWORD_RESET_URL környezeti változó nincs beállítva!'); })(),
                changeEmailAddressUrl: process.env.CHANGE_EMAIL_URL || (() => { throw new Error('CHANGE_EMAIL_URL környezeti változó nincs beállítva!'); })()
            },
        }),
        AdminUiPlugin.init({
            route: 'admin',
            port: serverPort, // Use the same port as the main server
            adminUiConfig: {
                apiPort: serverPort, // Az Admin UI hívja a Vendure API-t ezen a porton
            },
        }),
    ],
};
