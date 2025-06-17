import { AssetUploadWebhookPlugin } from './asset-upload-webhook.plugin';

export const config: VendureConfig = {
  // ...
  plugins: [
    // ... egyéb pluginok
    AssetUploadWebhookPlugin,
  ],
};
