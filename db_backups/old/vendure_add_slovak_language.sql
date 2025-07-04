-- Szlovák nyelv hozzáadása a rendszerhez

-- Először ellenőrizzük a jelenlegi nyelveket
SELECT code, name FROM "language";

-- Ha a szlovák nyelv még nem létezik, adjuk hozzá
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "language" WHERE code = 'sk') THEN
        INSERT INTO "language" ("createdAt", "updatedAt", code, name)
        VALUES (NOW(), NOW(), 'sk', 'Slovak');
        RAISE NOTICE 'Szlovák nyelv hozzáadva';
    ELSE
        RAISE NOTICE 'A szlovák nyelv már létezik';
    END IF;
END$$;

-- Frissítsük a csatornák elérhető nyelveit
UPDATE channel
SET "availableLanguageCodes" = '{sk,en}'
WHERE code = 'archive_channel';

UPDATE channel
SET "availableLanguageCodes" = '{hu,en}'
WHERE code = 'hungarian_channel';

UPDATE channel
SET "availableLanguageCodes" = '{sk,en,hu}'
WHERE code = 'slovak_channel';

-- Ellenőrizzük a csatornák nyelvbeállításait
SELECT code, "defaultLanguageCode", "availableLanguageCodes" FROM channel;

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

-- Példa használat (kommentezve):
-- SELECT add_product_translation(1, 'hu', 'Magyar terméknév', 'Magyar termékleírás');
-- SELECT add_product_translation(1, 'en', 'English product name', 'English product description');
-- SELECT add_product_translation(1, 'sk', 'Slovenský názov produktu', 'Slovenský popis produktu');

-- Hozzunk létre egy segédfunkciót a termékváltozatok fordításainak kezeléséhez
CREATE OR REPLACE FUNCTION add_product_variant_translation(
    variant_id INTEGER,
    lang_code VARCHAR,
    name_translation VARCHAR
) RETURNS VOID AS $$
BEGIN
    -- Ellenőrizzük, hogy létezik-e már fordítás az adott nyelven
    IF EXISTS (SELECT 1 FROM product_variant_translation WHERE "productVariantId" = variant_id AND "languageCode" = lang_code) THEN
        -- Ha igen, frissítsük
        UPDATE product_variant_translation
        SET name = name_translation
        WHERE "productVariantId" = variant_id AND "languageCode" = lang_code;
    ELSE
        -- Ha nem, hozzuk létre
        INSERT INTO product_variant_translation ("createdAt", "updatedAt", "languageCode", name, "productVariantId")
        VALUES (NOW(), NOW(), lang_code, name_translation, variant_id);
    END IF;
    
    RAISE NOTICE 'Termékváltozat fordítás hozzáadva/frissítve: % - %', variant_id, lang_code;
END;
$$ LANGUAGE plpgsql;

-- Példa használat (kommentezve):
-- SELECT add_product_variant_translation(1, 'hu', 'Magyar változatnév');
-- SELECT add_product_variant_translation(1, 'en', 'English variant name');
-- SELECT add_product_variant_translation(1, 'sk', 'Slovenský názov variantu');
