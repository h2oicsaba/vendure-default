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
        console.log('========== VPS ASSET SYNC PLUGIN ELINDULT ==========');
        console.log(`VPS URL: ${process.env.VPS_UPLOAD_URL || 'Nincs megadva (alapértelmezett lesz használva)'}`);
        
        // Subscribe to asset events
        this.eventBus.ofType(AssetEvent).subscribe(event => {
            if (event.type === 'created') {
                console.log(`========== ÚJ ASSET LÉTREHOZVA [ID: ${event.asset.id}] ==========`);
                console.log(`Asset adatok: Név=${event.asset.name}, Mime=${event.asset.mimeType}`);
                
                // Asset was created, sync it to VPS
                this.assetSyncService.syncAssetToVps(event.asset).catch((err: Error) => {
                    console.error(`========== VPS SYNC HIBA [ID: ${event.asset.id}] ==========`);
                    console.error(err instanceof Error ? err.message : String(err));
                });
            } else if (event.type === 'updated') {
                console.log(`========== ASSET FRISSÍTVE [ID: ${event.asset.id}] ==========`);
                
                // Asset was updated, sync it to VPS
                this.assetSyncService.syncAssetToVps(event.asset).catch((err: Error) => {
                    console.error(`========== VPS SYNC HIBA [ID: ${event.asset.id}] ==========`);
                    console.error(err instanceof Error ? err.message : String(err));
                });
            }
        });
    }
}
