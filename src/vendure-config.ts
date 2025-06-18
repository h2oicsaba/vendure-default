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

// VPS Asset pluginek importálása
import { AssetSyncPlugin } from './plugins/vps_assets/asset-sync.plugin';
import { AssetUploadWebhookPlugin } from './plugins/vps_assets/asset-upload-webhook.plugin';

// ----------------------------------------------------

// Konfigurációs választók a környezeti változókból
const IS_DEV = process.env.APP_ENV === 'dev';
const USE_VPS_UPLOAD = process.env.USE_VPS_UPLOAD === 'advanced';
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
        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path.join(__dirname, '../static/assets'),
            // Az assetUrlPrefix beállítása környezeti változóból
            assetUrlPrefix: USE_VPS_UPLOAD ? process.env.ASSET_URL_PREFIX : undefined,
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
            
        // VPS asset pluginek használata, ha USE_VPS_UPLOAD=advanced
        ...(USE_VPS_UPLOAD ? [
            AssetSyncPlugin,
            AssetUploadWebhookPlugin.init({
                vpsUploadUrl: process.env.VPS_UPLOAD_URL ? process.env.VPS_UPLOAD_URL : (() => {
                    throw new Error('VPS_UPLOAD_URL környezeti változó nincs beállítva!');
                })(),
                timeout: process.env.VPS_UPLOAD_TIMEOUT ? parseInt(process.env.VPS_UPLOAD_TIMEOUT) : 10000,
            })
        ] : []),

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
            port: 3002,
            adminUiConfig: {
                apiPort: serverPort, // Az Admin UI hívja a Vendure API-t ezen a porton
            },
        }),
    ],
};
