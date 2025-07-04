-- 11. Vendure termékek archiválása
-- Ez a szkript kiüríti a magyar és szlovák csatornákat, ha szükséges

-- Kiürítjük a magyar csatornát
DO $$
BEGIN
    RAISE NOTICE 'Magyar csatorna kiürítése...';
    
    -- Töröljük a termékeket a magyar csatornából
    DELETE FROM product_channels_channel 
    WHERE "channelId" = (SELECT id FROM channel WHERE code = 'hungarian_channel');
    
    -- Töröljük a termékváltozatokat a magyar csatornából
    DELETE FROM product_variant_channels_channel 
    WHERE "channelId" = (SELECT id FROM channel WHERE code = 'hungarian_channel');
    
    RAISE NOTICE 'Magyar csatorna sikeresen kiürítve.';
END$$;

-- Kiürítjük a szlovák csatornát
DO $$
BEGIN
    RAISE NOTICE 'Szlovák csatorna kiürítése...';
    
    -- Töröljük a termékeket a szlovák csatornából
    DELETE FROM product_channels_channel 
    WHERE "channelId" = (SELECT id FROM channel WHERE code = 'slovak_channel');
    
    -- Töröljük a termékváltozatokat a szlovák csatornából
    DELETE FROM product_variant_channels_channel 
    WHERE "channelId" = (SELECT id FROM channel WHERE code = 'slovak_channel');
    
    RAISE NOTICE 'Szlovák csatorna sikeresen kiürítve.';
END$$;

-- Ellenőrizzük a csatornák termékeinek számát
SELECT c.code, COUNT(pc."productId") as product_count
FROM channel c
LEFT JOIN product_channels_channel pc ON c.id = pc."channelId"
GROUP BY c.code
ORDER BY c.code;

-- Ellenőrizzük a csatornák termékváltozatainak számát
SELECT c.code, COUNT(pvc."productVariantId") as variant_count
FROM channel c
LEFT JOIN product_variant_channels_channel pvc ON c.id = pvc."channelId"
GROUP BY c.code
ORDER BY c.code;
