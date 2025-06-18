import { Injectable, Logger } from '@nestjs/common';
import { Asset } from '@vendure/core';
import axios from 'axios';
import * as fs from 'fs';
import FormData from 'form-data';
import * as path from 'path';
import 'dotenv/config';

@Injectable()
export class AssetSyncService {
    private readonly logger = new Logger(AssetSyncService.name);
    private readonly vpsUploadUrl: string;
    private readonly timeout: number;

    constructor() {
        // VPS URL meghatározása a környezeti változóból
        if (!process.env.VPS_UPLOAD_URL) {
            throw new Error('VPS_UPLOAD_URL környezeti változó nincs beállítva!');
        }
        this.vpsUploadUrl = process.env.VPS_UPLOAD_URL;
        this.timeout = process.env.VPS_UPLOAD_TIMEOUT ? parseInt(process.env.VPS_UPLOAD_TIMEOUT) : 10000;
        
        this.logger.log(`Asset sync service inicializálva: ${this.vpsUploadUrl}`);
    }

    /**
     * Asset szinkronizálása a VPS-re
     * @param asset Az asset objektum, amit szinkronizálni kell
     */
    async syncAssetToVps(asset: Asset): Promise<void> {
        const fileName = asset.name;
        const assetId = asset.id;
        
        // Az asset forrásának elérési útja
        const originalPath = asset.source; // pl. source/74/download.svg
        
        // A Vendure AssetServerPlugin konfigurációjában megadott könyvtár
        // A konfigurációban ez: assetUploadDir: path.join(__dirname, '../static/assets')
        const assetDir = path.join(__dirname, '../../../static/assets');
        
        // A fájl teljes elérési útja
        const filePath = path.join(assetDir, originalPath);

        // Részletes információk kilogolása
        this.logger.log(`========== VPS ASSET SYNC START [ID: ${assetId}] ==========`);
        this.logger.log(`Asset adatok: ID=${assetId}, Név=${fileName}`);
        this.logger.log(`Eredeti elérési út: ${originalPath}`);
        this.logger.log(`Keresett fájl: ${filePath}`);
        this.logger.log(`Cél URL: ${this.vpsUploadUrl}`);

        // Ellenőrizzük, hogy létezik-e a fájl
        if (fs.existsSync(filePath)) {
            this.logger.log(`Fájl megtalálva a lemezen: ${filePath}`);
            
            // Használjuk az improved upload server funkcionalitását, amely megőrzi a könyvtárstruktúrát
            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath), fileName);
            // Az eredeti elérési utat is küldjük, hogy a szerver tudja, hova mentse a fájlt
            formData.append('originalPath', originalPath);

            try {
                this.logger.log(`VPS feltöltés megkezdése: ${fileName} (ID: ${assetId})`);
                
                const response = await axios.post(this.vpsUploadUrl, formData, {
                    headers: formData.getHeaders(),
                    timeout: this.timeout,
                });
                
                this.logger.log(`VPS válasz: ${JSON.stringify(response.data)}`);
                this.logger.log(`========== VPS ASSET SYNC SIKERES [ID: ${assetId}] ==========`);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                this.logger.error(`VPS feltöltési HIBA: ${errorMessage}`);
                this.logger.error(`========== VPS ASSET SYNC SIKERTELEN [ID: ${assetId}] ==========`);
                throw err; // Továbbdobjuk a hibát, hogy a hívó kezelje
            }
        } else {
            // Próbáljunk meg más lehetséges helyeken keresni
            // Próbáljuk meg az assets könyvtárban is keresni
            const alternativePath = path.join(__dirname, '../../../assets', originalPath);
            this.logger.warn(`Fájl NEM található az elsődleges helyen: ${filePath}`);
            this.logger.warn(`Próbálkozás alternatív helyen: ${alternativePath}`);
            
            if (fs.existsSync(alternativePath)) {
                this.logger.log(`Fájl megtalálva alternatív helyen: ${alternativePath}`);
                
                const formData = new FormData();
                formData.append('file', fs.createReadStream(alternativePath), fileName);
                // Az eredeti elérési utat is küldjük, hogy a szerver tudja, hova mentse a fájlt
                formData.append('originalPath', originalPath);

                try {
                    this.logger.log(`VPS feltöltés megkezdése: ${fileName} (ID: ${assetId})`);
                    
                    const response = await axios.post(this.vpsUploadUrl, formData, {
                        headers: formData.getHeaders(),
                        timeout: this.timeout,
                    });
                    
                    this.logger.log(`VPS válasz: ${JSON.stringify(response.data)}`);
                    this.logger.log(`========== VPS ASSET SYNC SIKERES [ID: ${assetId}] ==========`);
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    this.logger.error(`VPS feltöltési HIBA: ${errorMessage}`);
                    this.logger.error(`========== VPS ASSET SYNC SIKERTELEN [ID: ${assetId}] ==========`);
                    throw err;
                }
            } else {
                // Keressük meg a fájlt a teljes projektben
                this.logger.warn(`Fájl NEM található az alternatív helyen sem: ${alternativePath}`);
                this.logger.warn(`========== VPS ASSET SYNC SIKERTELEN [ID: ${assetId}] ==========`);
                throw new Error(`Asset fájl nem található: ${originalPath}`);
            }
        }
    }
}
