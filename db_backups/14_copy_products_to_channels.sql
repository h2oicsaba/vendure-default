-- 14. Termékek átmásolása az alapértelmezett csatornából a magyar és szlovák csatornákba
-- Ez a szkript átmásolja az összes terméket és termékváltozatot az alapértelmezett csatornából
-- a magyar és szlovák csatornákba.

DO $$
DECLARE
    default_channel_id INT;
    hungarian_channel_id INT;
    slovak_channel_id INT;
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
    
    -- Termékek átmásolása az alapértelmezett csatornából a magyar csatornába
    INSERT INTO product_channels_channel ("productId", "channelId")
    SELECT 
        "productId", 
        hungarian_channel_id
    FROM 
        product_channels_channel
    WHERE 
        "channelId" = default_channel_id
        AND NOT EXISTS (
            SELECT 1 FROM product_channels_channel
            WHERE "channelId" = hungarian_channel_id
            AND "productId" = product_channels_channel."productId"
        );
    
    -- Termékek átmásolása az alapértelmezett csatornából a szlovák csatornába
    INSERT INTO product_channels_channel ("productId", "channelId")
    SELECT 
        "productId", 
        slovak_channel_id
    FROM 
        product_channels_channel
    WHERE 
        "channelId" = default_channel_id
        AND NOT EXISTS (
            SELECT 1 FROM product_channels_channel
            WHERE "channelId" = slovak_channel_id
            AND "productId" = product_channels_channel."productId"
        );
    
    -- Termékváltozatok átmásolása az alapértelmezett csatornából a magyar csatornába
    INSERT INTO product_variant_channels_channel ("productVariantId", "channelId")
    SELECT 
        "productVariantId", 
        hungarian_channel_id
    FROM 
        product_variant_channels_channel
    WHERE 
        "channelId" = default_channel_id
        AND NOT EXISTS (
            SELECT 1 FROM product_variant_channels_channel
            WHERE "channelId" = hungarian_channel_id
            AND "productVariantId" = product_variant_channels_channel."productVariantId"
        );
    
    -- Termékváltozatok átmásolása az alapértelmezett csatornából a szlovák csatornába
    INSERT INTO product_variant_channels_channel ("productVariantId", "channelId")
    SELECT 
        "productVariantId", 
        slovak_channel_id
    FROM 
        product_variant_channels_channel
    WHERE 
        "channelId" = default_channel_id
        AND NOT EXISTS (
            SELECT 1 FROM product_variant_channels_channel
            WHERE "channelId" = slovak_channel_id
            AND "productVariantId" = product_variant_channels_channel."productVariantId"
        );
    
    RAISE NOTICE 'Termékek és termékváltozatok sikeresen átmásolva a magyar és szlovák csatornákba';
END$$;

-- Ellenőrizzük a csatornákhoz rendelt termékek számát
SELECT 
    c.code AS channel_code, 
    COUNT(DISTINCT pc."productId") AS product_count
FROM 
    channel c
LEFT JOIN 
    product_channels_channel pc ON c.id = pc."channelId"
GROUP BY 
    c.code;

-- Ellenőrizzük a csatornákhoz rendelt termékváltozatok számát
SELECT 
    c.code AS channel_code, 
    COUNT(DISTINCT pvc."productVariantId") AS variant_count
FROM 
    channel c
LEFT JOIN 
    product_variant_channels_channel pvc ON c.id = pvc."channelId"
GROUP BY 
    c.code;
