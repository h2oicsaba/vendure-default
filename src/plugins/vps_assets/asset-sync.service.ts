import { Injectable, Logger } from '@nestjs/common';
import { Asset } from '@vendure/core';
import axios from 'axios';
import * as fs from 'fs';
import * as FormData from 'form-data';
import 'dotenv/config';

@Injectable()
export class AssetSyncService {
    private readonly logger = new Logger(AssetSyncService.name);
    private readonly vpsUploadUrl: string;
    private readonly timeout: number;

    constructor() {
        // VPS URL meghatározása: először a környezeti változóból, majd az alapértelmezett érték
        this.vpsUploadUrl = process.env.VPS_UPLOAD_URL || 'http://91.99.75.89:3000/upload';
        this.timeout = process.env.VPS_UPLOAD_TIMEOUT ? parseInt(process.env.VPS_UPLOAD_TIMEOUT) : 10000;
        
        this.logger.log(`Asset sync service inicializálva: ${this.vpsUploadUrl}`);
    }

    /**
     * Asset szinkronizálása a VPS-re
     * @param asset Az asset objektum, amit szinkronizálni kell
     */
    async syncAssetToVps(asset: Asset): Promise<void> {
        const filePath = asset.source; // Railway konténeren belüli elérési út
        const fileName = asset.name;

        if (fs.existsSync(filePath)) {
            const formData = new (FormData as any)();
            formData.append('file', fs.createReadStream(filePath), fileName);

            try {
                this.logger.debug(`Asset feltöltése a VPS-re: ${fileName}`);
                
                await axios.post(this.vpsUploadUrl, formData, {
                    headers: formData.getHeaders(),
                    timeout: this.timeout,
                });
                
                this.logger.log(`Asset sikeresen feltöltve a VPS-re: ${fileName}`);
            } catch (err) {
                this.logger.error(`Asset feltöltési hiba: ${fileName}`, err instanceof Error ? err.message : String(err));
                throw err; // Továbbdobjuk a hibát, hogy a hívó kezelje
            }
        } else {
            this.logger.warn(`Asset fájl nem található: ${filePath}`);
            throw new Error(`Asset fájl nem található: ${filePath}`);
        }
    }
}
