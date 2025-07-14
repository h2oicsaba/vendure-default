-- 15. Egy termék eltávolítása egy adott csatornából
-- Ez a szkript eltávolít egy terméket egy adott csatornából, de meghagyja az alapértelmezett csatornában.
-- Használat: Cseréld ki a 'TERMÉK_ID' és 'CSATORNA_KÓD' értékeket a megfelelő értékekre.

DO $$
DECLARE
    product_id INT := 123; -- Cseréld ki a termék ID-jára
    channel_code VARCHAR := 'hungarian_channel'; -- Cseréld ki a csatorna kódjára (pl. 'hungarian_channel' vagy 'slovak_channel')
    channel_id INT;
    affected_rows INT;
BEGIN
    -- Csatorna azonosító lekérése
    SELECT id INTO channel_id FROM channel WHERE code = channel_code;
    
    -- Ellenőrizzük, hogy létezik-e a csatorna
    IF channel_id IS NULL THEN
        RAISE EXCEPTION 'A megadott csatorna nem található: %', channel_code;
    END IF;
    
    -- Termék eltávolítása a csatornából
    DELETE FROM product_channels_channel
    WHERE "productId" = product_id AND "channelId" = channel_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    IF affected_rows > 0 THEN
        RAISE NOTICE 'A termék (ID: %) sikeresen eltávolítva a csatornából (%)', product_id, channel_code;
    ELSE
        RAISE NOTICE 'A termék (ID: %) nem volt hozzárendelve a csatornához (%)', product_id, channel_code;
    END IF;
    
    -- Termékváltozatok eltávolítása a csatornából
    DELETE FROM product_variant_channels_channel
    WHERE "productVariantId" IN (
        SELECT id FROM product_variant WHERE "productId" = product_id
    ) AND "channelId" = channel_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RAISE NOTICE '% termékváltozat eltávolítva a csatornából', affected_rows;
END$$;
