-- 07. Vendure admin felület nyelvi és locale beállításainak korlátozása
-- Ez a szkript tartalmazza a szükséges konfigurációs változtatásokat

-- FONTOS: Az admin felület nyelvválasztójában megjelenő nyelvek (EN, AR, CS, stb.)
-- és a locale-ok (HU, SK, stb.) a kódban vannak definiálva, nem az adatbázisban.
-- Ezeket a vendure-config.ts fájlban kell korlátozni.

-- 1. Ellenőrizzük a jelenlegi adatbázis beállításokat
SELECT * FROM global_settings;

-- 2. Frissítsük a global_settings táblát, hogy tartalmazzon minden nyelvet
-- amit a termékek fordításainál használni szeretnénk
UPDATE global_settings
SET "availableLanguages" = 'en,hu,sk'
WHERE id = 1;

-- 3. Ellenőrizzük a frissített beállításokat
SELECT * FROM global_settings;

-- 4. Az admin UI nyelvválasztó és locale korlátozásához a vendure-config.ts fájlt kell módosítani:
/*
// Példa a vendure-config.ts fájlban:
import { VendureConfig, LanguageCode } from '@vendure/core';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';

export const config: VendureConfig = {
  // ... egyéb beállítások
  plugins: [
    AdminUiPlugin.init({
      port: 3002,
      app: {
        // Csak az angol nyelv engedélyezése az admin felületen
        availableLanguages: [LanguageCode.en],
        // Csak a magyar és szlovák locale-ok engedélyezése
        availableLocales: ['hu-HU', 'sk-SK'],
      },
    }),
    // ... egyéb pluginek
  ],
};
*/

-- MEGJEGYZÉS: A fenti kódmódosítást manuálisan kell elvégezni a vendure-config.ts fájlban.
-- Ez nem része az adatbázis szkripteknek, de szükséges a teljes beállításhoz.
