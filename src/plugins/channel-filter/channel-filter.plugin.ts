import { PluginCommonModule, VendurePlugin } from '@vendure/core';

/**
 * Ez a plugin megakadályozza, hogy az alapértelmezett csatorna termékei megjelenjenek más csatornákban.
 * 
 * A Vendure alapértelmezetten visszaesik az alapértelmezett csatornára, ha egy adott csatornában
 * nem talál termékeket. Ez a plugin kikapcsolja ezt a viselkedést a defaultChannelToken null-ra állításával.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    configuration: config => {
        // Beállítjuk a defaultChannelToken értékét null-ra, hogy ne legyen fallback
        // Ez a kulcs felelős azért, hogy ha nincs megadva csatorna, akkor melyik csatornát használja
        // Ha null, akkor nem lesz fallback az alapértelmezett csatornára
        config.defaultChannelToken = null;
        
        return config;
    }
})
export class ChannelFilterPlugin {}
