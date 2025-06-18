import { VendurePlugin, AssetEvent, EventBus, PluginCommonModule, Logger } from '@vendure/core';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as FormData from 'form-data';
import 'dotenv/config';

/**
 * Plugin konfigurációs opciók
 */
export interface AssetUploadWebhookOptions {
    /**
     * A VPS szerver URL-je, ahova a fájlokat küldi
     * Default: http://91.99.75.89:3000/upload
     */
    vpsUploadUrl?: string;
    
    /**
     * HTTP kérés timeout milliszekundumban
     * Default: 10000 (10 másodperc)
     */
    timeout?: number;
}

@VendurePlugin({
    imports: [PluginCommonModule],
})
@Injectable()
export class AssetUploadWebhookService implements OnApplicationBootstrap {
  private readonly logger = new Logger();
  private readonly options: AssetUploadWebhookOptions;

  constructor(private eventBus: EventBus) {
    this.options = AssetUploadWebhookPlugin.options;
  }

  async onApplicationBootstrap() {
    // VPS URL meghatározása: először a plugin opciókból, majd a környezeti változóból, végül a hardcoded érték
    const vpsUploadUrl = this.options.vpsUploadUrl || 
                        process.env.VPS_UPLOAD_URL || 
                        'http://91.99.75.89:3000/upload';
                        
    const timeout = this.options.timeout || 
                   (process.env.VPS_UPLOAD_TIMEOUT ? parseInt(process.env.VPS_UPLOAD_TIMEOUT) : 10000);

    this.logger.log(`Asset upload webhook inicializálva: ${vpsUploadUrl}`);

    this.eventBus.ofType(AssetEvent).subscribe(async (event) => {
      // Csak új asset feltöltéskor (ne törlés, ne frissítés)
      if (event.type === 'created') {
        const filePath = event.asset.source; // Railway konténeren belüli elérési út
        const fileName = event.asset.name;

        if (fs.existsSync(filePath)) {
          const formData = new (FormData as any)();
          formData.append('file', fs.createReadStream(filePath), fileName);

          try {
            this.logger.debug(`Asset feltöltése a VPS-re: ${fileName}`);
            
            await axios.post(vpsUploadUrl, formData, {
              headers: formData.getHeaders(),
              timeout: timeout,
            });
            
            this.logger.log(`Asset sikeresen feltöltve a VPS-re: ${fileName}`);
          } catch (err) {
            this.logger.error(`Asset feltöltési hiba: ${fileName}`, err instanceof Error ? err.message : String(err));
          }
        } else {
          this.logger.warn(`Asset fájl nem található: ${filePath}`);
        }
      }
    });
  }
}

/**
 * Plugin a Vendure assetekhez, amely az új asseteket automatikusan feltölti egy VPS szerverre
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [AssetUploadWebhookService],
  configuration: config => {
    config.logger.info('Asset Upload Webhook Plugin inicializálva');
    return config;
  }
})
export class AssetUploadWebhookPlugin {
  static options: AssetUploadWebhookOptions = {};

  /**
   * Inicializálja a plugint a megadott opciókkal
   */
  static init(options: AssetUploadWebhookOptions = {}): typeof AssetUploadWebhookPlugin {
    this.options = options;
    return AssetUploadWebhookPlugin;
  }
}
