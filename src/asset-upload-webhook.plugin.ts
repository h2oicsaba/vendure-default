import { VendurePlugin, OnVendureBootstrap, AssetEvent, EventBus } from '@vendure/core';
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as FormData from 'form-data';

@Injectable()
export class AssetUploadWebhookService implements OnVendureBootstrap {
  constructor(private eventBus: EventBus) {}

  async onVendureBootstrap() {
    this.eventBus.ofType(AssetEvent).subscribe(async (event) => {
      // Csak új asset feltöltéskor (ne törlés, ne frissítés)
      if (event.type === 'created') {
        const filePath = event.asset.source; // Railway konténeren belüli elérési út
        const fileName = event.asset.fileName;

        if (fs.existsSync(filePath)) {
          const formData = new FormData();
          formData.append('file', fs.createReadStream(filePath), fileName);

          try {
            await axios.post('http://91.99.75.89:3000/upload', formData, {
              headers: formData.getHeaders(),
              timeout: 10000,
            });
            console.log(`Asset POST-olva a VPS-re: ${fileName}`);
          } catch (err) {
            console.error(`Asset POST hiba: ${fileName}`, err.message);
          }
        }
      }
    });
  }
}

@VendurePlugin({
  providers: [AssetUploadWebhookService],
})
export class AssetUploadWebhookPlugin {}
