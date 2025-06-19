import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { S3AssetStorageStrategy } from './s3-asset-storage-strategy';

/**
 * S3 Asset Plugin a Vendure számára.
 * Ez a plugin lehetővé teszi az assetok S3-kompatibilis tárolóban való tárolását.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [],
    configuration: config => {
        // Csak akkor konfiguráljuk, ha a környezeti változók be vannak állítva
        if (process.env.USE_ASSET_STORAGE === 'advanced') {
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

            // Konfiguráljuk az S3 asset storage stratégiát
            config.assetOptions.assetStorageStrategy = new S3AssetStorageStrategy({
                bucket: process.env.S3_BUCKET,
                credentials: {
                    accessKeyId: process.env.S3_ACCESS_KEY_ID,
                    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
                },
                endpoint: process.env.S3_ENDPOINT,
                region: process.env.S3_REGION || 'us-east-1',
                forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
                assetUrlPrefix: process.env.ASSET_URL_PREFIX,
            });

            console.log('========== S3 ASSET PLUGIN ELINDULT ==========');
            console.log(`Bucket: ${process.env.S3_BUCKET}`);
            console.log(`Endpoint: ${process.env.S3_ENDPOINT || 'AWS S3'}`);
            console.log(`Asset URL Prefix: ${process.env.ASSET_URL_PREFIX || 'Nincs beállítva'}`);
        }

        return config;
    },
})
export class S3AssetPlugin {}
