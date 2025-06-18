import { PluginCommonModule, VendurePlugin, Type } from '@vendure/core';
import { OnApplicationBootstrap } from '@nestjs/common';
import { AssetEvent, EventBus } from '@vendure/core';
import { AssetSyncService } from './asset-sync.service';

/**
 * Plugin konfigurációs opciók
 */
export interface AssetSyncOptions {
    /**
     * A VPS szerver URL-je, ahova a fájlokat küldi
     * Default: http://91.99.75.89:3000/upload
     */
    vpsUploadUrl?: string;
}

/**
 * A plugin that syncs uploaded assets to a remote VPS server
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [AssetSyncService],
})
export class AssetSyncPlugin implements OnApplicationBootstrap {
    private static options: AssetSyncOptions = {};

    constructor(
        private eventBus: EventBus,
        private assetSyncService: AssetSyncService,
    ) {}

    /**
     * Inicializálja a plugint a megadott opciókkal
     */
    static init(options: AssetSyncOptions = {}): Type<AssetSyncPlugin> {
        this.options = options;
        return AssetSyncPlugin;
    }

    /**
     * Visszaadja a beállított opciókat
     */
    static getOptions(): AssetSyncOptions {
        return this.options;
    }

    async onApplicationBootstrap() {
        // Subscribe to asset created events
        this.eventBus.ofType(AssetEvent).subscribe(event => {
            if (event.type === 'created' || event.type === 'updated') {
                // Asset was created or updated, sync it to VPS
                this.assetSyncService.syncAssetToVps(event.asset).catch(err => {
                    console.error(`Failed to sync asset ${event.asset.id} to VPS:`, err instanceof Error ? err.message : String(err));
                });
            }
        });
    }
}
