// src/vendure-config.ts

import 'dotenv/config'; // Fontos, hogy ez legyen az ELSŐ import, hogy a .env változók betöltődjenek
import path from 'path';

import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSearchPlugin,
    VendureConfig,
    DefaultSchedulerPlugin
} from '@vendure/core';
import { BullMQJobQueuePlugin } from '@vendure/job-queue-plugin/package/bullmq';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { ElasticsearchPlugin } from '@vendure/elasticsearch-plugin';

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
        DefaultSchedulerPlugin.init(),

        // Job Queue plugin kiválasztása a környezeti változó alapján
        ...(USE_ADVANCED_JOB_QUEUE ? [
            BullMQJobQueuePlugin.init({
                connection: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: +(process.env.REDIS_PORT || 6379),
                }
            })
        ] : [
            DefaultJobQueuePlugin.init({
                useDatabaseForBuffer: true,
            })
        ]),
            
        // Search plugin kiválasztása a környezeti változó alapján
        ...(USE_ADVANCED_SEARCH ? [
            ElasticsearchPlugin.init({
                host: process.env.ELASTICSEARCH_HOST || 'localhost',
                port: +(process.env.ELASTICSEARCH_PORT || 9200),
                // username: process.env.ELASTICSEARCH_USERNAME, // Ha használsz auth-ot
                // password: process.env.ELASTICSEARCH_PASSWORD, // Ha használsz auth-ot
            })
        ] : [
            DefaultSearchPlugin
        ]),
            
        // Itt volt korábban a VPS asset pluginek konfigurációja, de eltávolítottuk

        EmailPlugin.init({
            devMode: IS_DEV as true, // TypeScript cast, hogy elfogadja a boolean értéket
            outputPath: path.join(__dirname, '../static/email/test-emails'),
            route: 'mailbox',
            handlers: defaultEmailHandlers,
            templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
            globalTemplateVars: {
                fromAddress: '"example" <noreply@example.com>',
                // Ezeket az URL-eket a frontend alkalmazásod URL-jére cseréld
                verifyEmailAddressUrl: 'http://localhost:8080/verify', 
                passwordResetUrl: 'http://localhost:8080/password-reset',
                changeEmailAddressUrl: 'http://localhost:8080/verify-email-address-change'
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
