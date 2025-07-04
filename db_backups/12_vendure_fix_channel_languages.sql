-- 12. Csatorna nyelvi beállítások javítása
-- Ez a szkript beállítja a megfelelő nyelveket a csatornákhoz

-- Ellenőrizzük a jelenlegi beállításokat
SELECT code, "defaultLanguageCode", "availableLanguageCodes" FROM channel;

-- Frissítsük a szlovák csatorna nyelvi beállításait
UPDATE channel
SET "defaultLanguageCode" = 'sk',
    "availableLanguageCodes" = 'sk,en,hu'
WHERE code = 'slovak_channel';

-- Frissítsük a magyar csatorna nyelvi beállításait is, hogy tartalmazzon minden nyelvet
UPDATE channel
SET "availableLanguageCodes" = 'hu,en,sk'
WHERE code = 'hungarian_channel';

-- Frissítsük az alapértelmezett csatorna nyelvi beállításait is
UPDATE channel
SET "availableLanguageCodes" = 'hu,en,sk'
WHERE code = '__default_channel__';

-- Ellenőrizzük a frissített beállításokat
SELECT code, "defaultLanguageCode", "availableLanguageCodes" FROM channel;
