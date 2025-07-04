-- Admin felület nyelveinek beállítása

-- Ellenőrizzük a jelenlegi beállításokat
SELECT * FROM global_settings;

-- Frissítsük a nyelveket, hogy tartalmazza a szlovákot is
UPDATE global_settings
SET "availableLanguages" = 'en,hu,sk'
WHERE id = 1;

-- Ellenőrizzük a frissített beállításokat
SELECT * FROM global_settings;
