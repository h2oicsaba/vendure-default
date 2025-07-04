-- Függvények javítása a fordításokhoz

-- Töröljük a meglévő függvényeket
DROP FUNCTION IF EXISTS add_product_translation(INTEGER, VARCHAR, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS add_product_variant_translation(INTEGER, VARCHAR, VARCHAR);

-- Hozzunk létre egy segédfunkciót a termékek fordításainak kezeléséhez
CREATE OR REPLACE FUNCTION add_product_translation(
    product_base_id INTEGER,
    lang_code VARCHAR,
    name_translation VARCHAR,
    description_translation TEXT
) RETURNS VOID AS $$
DECLARE
    slug_value VARCHAR;
BEGIN
    -- Generáljunk egy slug-ot a névből
    slug_value := LOWER(REPLACE(REPLACE(name_translation, ' ', '-'), '''', ''));
    
    -- Ellenőrizzük, hogy létezik-e már fordítás az adott nyelven
    IF EXISTS (SELECT 1 FROM product_translation WHERE "baseId" = product_base_id AND "languageCode" = lang_code) THEN
        -- Ha igen, frissítsük
        UPDATE product_translation
        SET 
            name = name_translation,
            description = description_translation,
            slug = slug_value
        WHERE "baseId" = product_base_id AND "languageCode" = lang_code;
    ELSE
        -- Ha nem, hozzuk létre
        INSERT INTO product_translation ("createdAt", "updatedAt", "languageCode", name, slug, description, "baseId")
        VALUES (NOW(), NOW(), lang_code, name_translation, slug_value, description_translation, product_base_id);
    END IF;
    
    RAISE NOTICE 'Termék fordítás hozzáadva/frissítve: % - %', product_base_id, lang_code;
END;
$$ LANGUAGE plpgsql;

-- Hozzunk létre egy függvényt a termékváltozatok fordításainak kezeléséhez
CREATE OR REPLACE FUNCTION add_product_variant_translation(
    variant_base_id INTEGER,
    lang_code VARCHAR,
    name_translation VARCHAR
) RETURNS VOID AS $$
BEGIN
    -- Ellenőrizzük, hogy létezik-e már fordítás az adott nyelven
    IF EXISTS (SELECT 1 FROM product_variant_translation WHERE "baseId" = variant_base_id AND "languageCode" = lang_code) THEN
        -- Ha igen, frissítsük
        UPDATE product_variant_translation
        SET name = name_translation
        WHERE "baseId" = variant_base_id AND "languageCode" = lang_code;
    ELSE
        -- Ha nem, hozzuk létre
        INSERT INTO product_variant_translation ("createdAt", "updatedAt", "languageCode", name, "baseId")
        VALUES (NOW(), NOW(), lang_code, name_translation, variant_base_id);
    END IF;
    
    RAISE NOTICE 'Termékváltozat fordítás hozzáadva/frissítve: % - %', variant_base_id, lang_code;
END;
$$ LANGUAGE plpgsql;

-- Példa használat:
-- SELECT add_product_translation(1, 'sk', 'Slovenský názov produktu', 'Slovenský popis produktu');
-- SELECT add_product_variant_translation(1, 'sk', 'Slovenský názov variantu');

-- Ellenőrizzük a termékfordításokat
SELECT "languageCode", COUNT(*) FROM product_translation GROUP BY "languageCode";
SELECT "languageCode", COUNT(*) FROM product_variant_translation GROUP BY "languageCode";
