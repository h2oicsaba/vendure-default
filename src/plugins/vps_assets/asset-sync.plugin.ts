import { PluginCommonModule, VendurePlugin, Type, AssetEvent, EventBus } from '@vendure/core';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
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

    async onApplicationBootstrap() {
        // Subscribe to asset events
        this.eventBus.ofType(AssetEvent).subscribe(event => {
            if (event.type === 'created' || event.type === 'updated') {
                // Asset was created or updated, sync it to VPS
                this.assetSyncService.syncAssetToVps(event.asset).catch((err: Error) => {
                    console.error(`Failed to sync asset ${event.asset.id} to VPS:`, err instanceof Error ? err.message : String(err));
                });
            }
        });
    }
}
