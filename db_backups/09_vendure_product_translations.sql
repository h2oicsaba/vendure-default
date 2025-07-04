-- 09. Termékfordítások kezelése
-- Ez a szkript létrehozza a hiányzó termékfordításokat

-- 1. Ellenőrizzük a jelenlegi fordításokat
SELECT "languageCode", COUNT(*) FROM product_translation GROUP BY "languageCode";
SELECT "languageCode", COUNT(*) FROM product_variant_translation GROUP BY "languageCode";

-- 2. Hozzuk létre a hiányzó magyar fordításokat az angol alapján
DO $$
DECLARE
    product_record RECORD;
    variant_record RECORD;
BEGIN
    -- Termékek fordítása
    FOR product_record IN 
        SELECT pt."baseId", pt.name, pt.slug, pt.description 
        FROM product_translation pt 
        WHERE pt."languageCode" = 'en'
    LOOP
        -- Ellenőrizzük, hogy létezik-e már magyar fordítás
        IF NOT EXISTS (SELECT 1 FROM product_translation WHERE "baseId" = product_record."baseId" AND "languageCode" = 'hu') THEN
            INSERT INTO product_translation ("baseId", "languageCode", name, slug, description)
            VALUES (
                product_record."baseId",
                'hu',
                product_record.name || ' (HU)',
                product_record.slug || '-hu',
                COALESCE(product_record.description, '') || ' (Magyar leírás)'
            );
        END IF;
    END LOOP;
    
    -- Termékváltozatok fordítása
    FOR variant_record IN 
        SELECT vt."baseId", vt.name 
        FROM product_variant_translation vt 
        WHERE vt."languageCode" = 'en'
    LOOP
        -- Ellenőrizzük, hogy létezik-e már magyar fordítás
        IF NOT EXISTS (SELECT 1 FROM product_variant_translation WHERE "baseId" = variant_record."baseId" AND "languageCode" = 'hu') THEN
            INSERT INTO product_variant_translation ("baseId", "languageCode", name)
            VALUES (
                variant_record."baseId",
                'hu',
                variant_record.name || ' (HU)'
            );
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Magyar fordítások létrehozva';
END$$;

-- 3. Hozzuk létre a hiányzó szlovák fordításokat az angol alapján
DO $$
DECLARE
    product_record RECORD;
    variant_record RECORD;
BEGIN
    -- Termékek fordítása
    FOR product_record IN 
        SELECT pt."baseId", pt.name, pt.slug, pt.description 
        FROM product_translation pt 
        WHERE pt."languageCode" = 'en'
    LOOP
        -- Ellenőrizzük, hogy létezik-e már szlovák fordítás
        IF NOT EXISTS (SELECT 1 FROM product_translation WHERE "baseId" = product_record."baseId" AND "languageCode" = 'sk') THEN
            INSERT INTO product_translation ("baseId", "languageCode", name, slug, description)
            VALUES (
                product_record."baseId",
                'sk',
                product_record.name || ' (SK)',
                product_record.slug || '-sk',
                COALESCE(product_record.description, '') || ' (Slovenský popis)'
            );
        END IF;
    END LOOP;
    
    -- Termékváltozatok fordítása
    FOR variant_record IN 
        SELECT vt."baseId", vt.name 
        FROM product_variant_translation vt 
        WHERE vt."languageCode" = 'en'
    LOOP
        -- Ellenőrizzük, hogy létezik-e már szlovák fordítás
        IF NOT EXISTS (SELECT 1 FROM product_variant_translation WHERE "baseId" = variant_record."baseId" AND "languageCode" = 'sk') THEN
            INSERT INTO product_variant_translation ("baseId", "languageCode", name)
            VALUES (
                variant_record."baseId",
                'sk',
                variant_record.name || ' (SK)'
            );
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Szlovák fordítások létrehozva';
END$$;

-- 4. Ellenőrizzük az eredményt
SELECT "languageCode", COUNT(*) FROM product_translation GROUP BY "languageCode";
SELECT "languageCode", COUNT(*) FROM product_variant_translation GROUP BY "languageCode";
