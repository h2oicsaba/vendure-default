-- 13. Termékek eltávolítása a magyar és szlovák csatornákból
-- Ez a szkript eltávolítja az összes terméket és kapcsolódó adatot a magyar és szlovák csatornákból,
-- de meghagyja őket az alapértelmezett csatornában.
--
-- FONTOS: Ez a szkript csak az adatbázisban törli a termékek és csatornák közötti kapcsolatot,
-- de nem törli magukat a termékeket. A termékek továbbra is elérhetőek lesznek az alapértelmezett
-- csatornában, de nem jelennek meg a magyar és szlovák csatornákban.

DO $$
DECLARE
    default_channel_id INT;
    hungarian_channel_id INT;
    slovak_channel_id INT;
    affected_rows INT;
    total_affected INT := 0;
BEGIN
    -- Csatorna azonosítók lekérése
    SELECT id INTO default_channel_id FROM channel WHERE code = '__default_channel__';
    SELECT id INTO hungarian_channel_id FROM channel WHERE code = 'hungarian_channel';
    SELECT id INTO slovak_channel_id FROM channel WHERE code = 'slovak_channel';
    
    -- Ellenőrizzük, hogy léteznek-e a csatornák
    IF default_channel_id IS NULL THEN
        RAISE EXCEPTION 'Az alapértelmezett csatorna nem található!';
    END IF;
    
    IF hungarian_channel_id IS NULL THEN
        RAISE EXCEPTION 'A magyar csatorna nem található!';
    END IF;
    
    IF slovak_channel_id IS NULL THEN
        RAISE EXCEPTION 'A szlovák csatorna nem található!';
    END IF;
    
    -- Termékek eltávolítása a magyar csatornából
    DELETE FROM product_channels_channel
    WHERE "channelId" = hungarian_channel_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    total_affected := total_affected + affected_rows;
    RAISE NOTICE '% termék eltávolítva a magyar csatornából', affected_rows;
    
    -- Termékek eltávolítása a szlovák csatornából
    DELETE FROM product_channels_channel
    WHERE "channelId" = slovak_channel_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    total_affected := total_affected + affected_rows;
    RAISE NOTICE '% termék eltávolítva a szlovák csatornából', affected_rows;
    
    -- Termékváltozatok eltávolítása a magyar csatornából
    DELETE FROM product_variant_channels_channel
    WHERE "channelId" = hungarian_channel_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    total_affected := total_affected + affected_rows;
    RAISE NOTICE '% termékváltozat eltávolítva a magyar csatornából', affected_rows;
    
    -- Termékváltozatok eltávolítása a szlovák csatornából
    DELETE FROM product_variant_channels_channel
    WHERE "channelId" = slovak_channel_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    total_affected := total_affected + affected_rows;
    RAISE NOTICE '% termékváltozat eltávolítva a szlovák csatornából', affected_rows;
    
    -- Gyűjtemények eltávolítása a magyar csatornából
    DELETE FROM collection_channels_channel
    WHERE "channelId" = hungarian_channel_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    total_affected := total_affected + affected_rows;
    RAISE NOTICE '% gyűjtemény eltávolítva a magyar csatornából', affected_rows;
    
    -- Gyűjtemények eltávolítása a szlovák csatornából
    DELETE FROM collection_channels_channel
    WHERE "channelId" = slovak_channel_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    total_affected := total_affected + affected_rows;
    RAISE NOTICE '% gyűjtemény eltávolítva a szlovák csatornából', affected_rows;
    
    -- Facet-ek eltávolítása a magyar csatornából
    DELETE FROM facet_channels_channel
    WHERE "channelId" = hungarian_channel_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    total_affected := total_affected + affected_rows;
    RAISE NOTICE '% facet eltávolítva a magyar csatornából', affected_rows;
    
    -- Facet-ek eltávolítása a szlovák csatornából
    DELETE FROM facet_channels_channel
    WHERE "channelId" = slovak_channel_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    total_affected := total_affected + affected_rows;
    RAISE NOTICE '% facet eltávolítva a szlovák csatornából', affected_rows;
    
    -- Facet értékek eltávolítása a magyar csatornából
    DELETE FROM facet_value_channels_channel
    WHERE "channelId" = hungarian_channel_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    total_affected := total_affected + affected_rows;
    RAISE NOTICE '% facet érték eltávolítva a magyar csatornából', affected_rows;
    
    -- Facet értékek eltávolítása a szlovák csatornából
    DELETE FROM facet_value_channels_channel
    WHERE "channelId" = slovak_channel_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    total_affected := total_affected + affected_rows;
    RAISE NOTICE '% facet érték eltávolítva a szlovák csatornából', affected_rows;
    
    -- Asset-ek eltávolítása a magyar csatornából
    DELETE FROM asset_channels_channel
    WHERE "channelId" = hungarian_channel_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    total_affected := total_affected + affected_rows;
    RAISE NOTICE '% asset eltávolítva a magyar csatornából', affected_rows;
    
    -- Asset-ek eltávolítása a szlovák csatornából
    DELETE FROM asset_channels_channel
    WHERE "channelId" = slovak_channel_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    total_affected := total_affected + affected_rows;
    RAISE NOTICE '% asset eltávolítva a szlovák csatornából', affected_rows;
    
    RAISE NOTICE 'Összesen % elem eltávolítva a magyar és szlovák csatornákból', total_affected;
    
    -- Frissítsük az aktív csatornát az alapértelmezett csatornára
    UPDATE session 
    SET "activeChannelId" = default_channel_id
    WHERE type = 'AuthenticatedSession';
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE '% munkamenet frissítve az alapértelmezett csatornára', affected_rows;
END$$;

-- Ellenőrizzük, hogy hány termék maradt a csatornákban
SELECT c.code AS channel_code, COUNT(p."productId") AS product_count
FROM channel c
LEFT JOIN product_channels_channel p ON c.id = p."channelId"
GROUP BY c.code;

-- Ellenőrizzük, hogy hány termékváltozat maradt a csatornákban
SELECT c.code AS channel_code, COUNT(pv."productVariantId") AS variant_count
FROM channel c
LEFT JOIN product_variant_channels_channel pv ON c.id = pv."channelId"
GROUP BY c.code;
