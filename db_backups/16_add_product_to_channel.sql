-- 16. Egy termék hozzáadása egy adott csatornához
-- Ez a szkript hozzáad egy terméket egy adott csatornához, ha az még nincs hozzárendelve.
-- Használat: Cseréld ki a 'product_id' és 'channel_code' értékeket a megfelelő értékekre.

DO $$
DECLARE
    product_id INT := 123; -- Cseréld ki a termék ID-jára
    channel_code VARCHAR := 'hungarian_channel'; -- Cseréld ki a csatorna kódjára (pl. 'hungarian_channel' vagy 'slovak_channel')
    channel_id INT;
    affected_rows INT;
    variant_count INT := 0;
BEGIN
    -- Csatorna azonosító lekérése
    SELECT id INTO channel_id FROM channel WHERE code = channel_code;
    
    -- Ellenőrizzük, hogy létezik-e a csatorna
    IF channel_id IS NULL THEN
        RAISE EXCEPTION 'A megadott csatorna nem található: %', channel_code;
    END IF;
    
    -- Ellenőrizzük, hogy létezik-e a termék
    IF NOT EXISTS (SELECT 1 FROM product WHERE id = product_id) THEN
        RAISE EXCEPTION 'A megadott termék nem található: %', product_id;
    END IF;
    
    -- Termék hozzáadása a csatornához, ha még nincs hozzárendelve
    INSERT INTO product_channels_channel ("productId", "channelId")
    SELECT product_id, channel_id
    WHERE NOT EXISTS (
        SELECT 1 FROM product_channels_channel
        WHERE "productId" = product_id AND "channelId" = channel_id
    );
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    IF affected_rows > 0 THEN
        RAISE NOTICE 'A termék (ID: %) sikeresen hozzáadva a csatornához (%)', product_id, channel_code;
    ELSE
        RAISE NOTICE 'A termék (ID: %) már hozzá van rendelve a csatornához (%)', product_id, channel_code;
    END IF;
    
    -- Termékváltozatok hozzáadása a csatornához
    INSERT INTO product_variant_channels_channel ("productVariantId", "channelId")
    SELECT pv.id, channel_id
    FROM product_variant pv
    WHERE pv."productId" = product_id
    AND NOT EXISTS (
        SELECT 1 FROM product_variant_channels_channel
        WHERE "productVariantId" = pv.id AND "channelId" = channel_id
    );
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RAISE NOTICE '% termékváltozat hozzáadva a csatornához', affected_rows;
END$$;
