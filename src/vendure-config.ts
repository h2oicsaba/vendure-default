// src/vendure-config.ts

import {
    dummyPaymentHandler,
    // Az alapértelmezett plugineket már nem importáljuk, helyette a BullMQ és Typesense plugineket használjuk
    // DefaultJobQueuePlugin, 
    DefaultSchedulerPlugin,
    // DefaultSearchPlugin,
    VendureConfig,
} from '@vendure/core';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import 'dotenv/config'; // Fontos, hogy ez legyen az ELSŐ import, hogy a .env változók betöltődjenek
import path from 'path';

// --- Új importok a Redis és Typesense pluginekhez ---
import { BullMQJobQueuePlugin } from '@vendure/job-queue-plugin/package/bullmq/plugin'; // <-- EZ AZ ÚJ SOR
import { ElasticsearchPlugin } from '@vendure/elasticsearch-plugin'; // EZ AZ ÚJ IMPORT!

// VPS Asset plugin import
import { AssetUploadWebhookPlugin, AssetSyncPlugin } from './plugins/vps_assets';

// ----------------------------------------------------

const IS_DEV = process.env.APP_ENV === 'dev';
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
            // Az assetUrlPrefix beállítása IS_DEV alapján
            assetUrlPrefix: IS_DEV ? undefined : 'https://www.my-shop.com/assets/', // Cseréld erre a saját éles URL-edet!
        }),
        DefaultSchedulerPlugin.init(),

        // --- JobQueuePlugin (Redis-szel) lecseréli a DefaultJobQueuePlugin-t ---
        BullMQJobQueuePlugin.init({
            connection: { // A BullMQJobQueuePlugin.init közvetlenül a connection-t várja!
                host: process.env.REDIS_HOST,
                port: +process.env.REDIS_PORT!,
                 // password: process.env.REDIS_PASSWORD, // Add hozzá, ha a Redisnek van jelszava
            }
        }),        
        // ---------------------------------------------------------------------

        // lecseréli a DefaultSearchPlugin-t ---
          // --- ElasticsearchPlugin inicializálása, a SearchPlugin-t nem kell külön importálni ---
        ElasticsearchPlugin.init({
            host: process.env.ELASTICSEARCH_HOST,
            port: +process.env.ELASTICSEARCH_PORT!,
            // username: process.env.ELASTICSEARCH_USERNAME, // Ha használsz auth-ot
            // password: process.env.ELASTICSEARCH_PASSWORD, // Ha használsz auth-ot
            
        }),
        // --------------------------------------------------------------------

        // VPS Asset pluginek - asset feltöltés és szinkronizáció
        AssetUploadWebhookPlugin.init({
            // VPS URL beállítása környezeti változóból, vagy az alapértelmezett érték használata
            vpsUploadUrl: process.env.VPS_UPLOAD_URL || 'http://91.99.75.89:3000/upload',
            // Timeout beállítása milliszekundumban
            timeout: process.env.VPS_UPLOAD_TIMEOUT ? parseInt(process.env.VPS_UPLOAD_TIMEOUT) : 10000,
        }),
        
        // Asset szinkronizációs plugin
        AssetSyncPlugin,

        EmailPlugin.init({
            devMode: true, // Élesben ez false legyen
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
            // Fontos: a portot a Vendure szerver portjához viszonyítjuk
            // Ha a Vendure szerver 3000-es porton fut, az Admin UI a 3002-esen lesz elérhető,
            // de ha Dockerben futtatod, a Docker Compose fájlban kell a port map-et kezelni.
            port: serverPort,
            adminUiConfig: {
                apiPort: serverPort, // Az Admin UI hívja a Vendure API-t ezen a porton
            },
        }),
    ],
};
