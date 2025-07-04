-- Javítsuk a csatornák nyelvbeállításait a megfelelő működéshez

-- Az archív csatornában minden nyelv elérhető legyen
UPDATE channel
SET "availableLanguageCodes" = '{hu,en,sk}'
WHERE code = 'archive_channel';

-- A magyar webáruházban a magyar az alapértelmezett, de elérhető az angol is
UPDATE channel
SET "defaultLanguageCode" = 'hu',
    "availableLanguageCodes" = '{hu,en}'
WHERE code = 'hungarian_channel';

-- A szlovák webáruházban a szlovák az alapértelmezett, de elérhető az angol is
UPDATE channel
SET "defaultLanguageCode" = 'sk',
    "availableLanguageCodes" = '{sk,en}'
WHERE code = 'slovak_channel';

-- Ellenőrizzük a csatornák nyelvbeállításait
SELECT code, "defaultLanguageCode", "availableLanguageCodes" FROM channel;

-- Hozzunk létre egy példa termékfordítást szlovák nyelven
-- Először ellenőrizzük, hogy van-e már szlovák fordítás
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM product_translation WHERE "languageCode" = 'sk') THEN
        -- Vegyük az első terméket és adjunk hozzá szlovák fordítást
        INSERT INTO product_translation ("createdAt", "updatedAt", "languageCode", name, description, "productId")
        SELECT NOW(), NOW(), 'sk', 'Slovenský názov produktu', 'Slovenský popis produktu', id
        FROM product
        ORDER BY id
        LIMIT 1;
        
        RAISE NOTICE 'Szlovák fordítás hozzáadva egy termékhez';
    ELSE
        RAISE NOTICE 'Már létezik szlovák fordítás';
    END IF;
END$$;

-- Ellenőrizzük a termékfordításokat
SELECT "languageCode", COUNT(*) FROM product_translation GROUP BY "languageCode";

-- Hozzunk létre egy segédfunkciót a termékek fordításainak kezeléséhez
CREATE OR REPLACE FUNCTION add_product_translation(
    product_id INTEGER,
    lang_code VARCHAR,
    name_translation VARCHAR,
    description_translation TEXT
) RETURNS VOID AS $$
BEGIN
    -- Ellenőrizzük, hogy létezik-e már fordítás az adott nyelven
    IF EXISTS (SELECT 1 FROM product_translation WHERE "productId" = product_id AND "languageCode" = lang_code) THEN
        -- Ha igen, frissítsük
        UPDATE product_translation
        SET 
            name = name_translation,
            description = description_translation
        WHERE "productId" = product_id AND "languageCode" = lang_code;
    ELSE
        -- Ha nem, hozzuk létre
        INSERT INTO product_translation ("createdAt", "updatedAt", "languageCode", name, description, "productId")
        VALUES (NOW(), NOW(), lang_code, name_translation, description_translation, product_id);
    END IF;
    
    RAISE NOTICE 'Termék fordítás hozzáadva/frissítve: % - %', product_id, lang_code;
END;
$$ LANGUAGE plpgsql;

-- Példa használat:
-- SELECT add_product_translation(1, 'hu', 'Magyar terméknév', 'Magyar termékleírás');
-- SELECT add_product_translation(1, 'en', 'English product name', 'English product description');
-- SELECT add_product_translation(1, 'sk', 'Slovenský názov produktu', 'Slovenský popis produktu');
