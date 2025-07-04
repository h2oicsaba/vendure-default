-- Vendure csatornák létrehozása a magyar és szlovák webáruházakhoz

-- 04. Vendure csatornák létrehozása és beállítása
-- Ez a szkript létrehozza a magyar és szlovák csatornákat, valamint beállítja a megfelelő neveket
-- A szkript biztonságosan többször is futtatható, nem hoz létre duplikált csatornákat

DO $$
DECLARE
    default_channel_id INT;
    default_token VARCHAR;
    default_seller_id INTEGER;
    hungarian_exists BOOLEAN;
    slovak_exists BOOLEAN;
BEGIN
    -- Mentsük el az alapértelmezett csatorna azonosítóját és tokenét
    SELECT id, token, "sellerId" INTO default_channel_id, default_token, default_seller_id FROM channel WHERE code = '__default_channel__';
    
    -- Ellenőrizzük, hogy léteznek-e már a csatornák
    SELECT EXISTS(SELECT 1 FROM channel WHERE code = 'hungarian_channel') INTO hungarian_exists;
    SELECT EXISTS(SELECT 1 FROM channel WHERE code = 'slovak_channel') INTO slovak_exists;
    
    -- Frissítsük az alapértelmezett csatorna leírását és nyelvbeállításait, de hagyjuk meg az eredeti kódját
    UPDATE channel
    SET 
        description = 'Archív termékek - nem jelenik meg a webáruházakban',
        "defaultLanguageCode" = 'hu',
        "availableLanguageCodes" = 'hu,en',
        "availableCurrencyCodes" = 'EUR'
    WHERE id = default_channel_id;
    
    -- Hozzuk létre a magyar csatornát, ha még nem létezik
    IF NOT hungarian_exists THEN
        INSERT INTO channel (
            "createdAt", "updatedAt", code, token, description,
            "defaultLanguageCode", "availableLanguageCodes",
            "defaultCurrencyCode", "availableCurrencyCodes",
            "trackInventory", "outOfStockThreshold", "pricesIncludeTax",
            "sellerId", "defaultTaxZoneId", "defaultShippingZoneId"
        )
        SELECT 
            NOW(), NOW(), 'hungarian_channel', 'hu_' || default_token, 'Magyar webáruház',
            'hu', 'hu,en',
            'HUF', 'EUR,HUF',
            "trackInventory", "outOfStockThreshold", "pricesIncludeTax",
            "sellerId", (SELECT id FROM zone WHERE name = 'SK-HU Markets'), (SELECT id FROM zone WHERE name = 'SK-HU Markets')
        FROM channel
        WHERE id = default_channel_id;
    ELSE
        -- Ha már létezik, frissítsük a beállításait
        UPDATE channel
        SET 
            "defaultLanguageCode" = 'hu',
            "availableLanguageCodes" = 'hu,en',
            "defaultCurrencyCode" = 'HUF',
            "availableCurrencyCodes" = 'EUR,HUF'
        WHERE code = 'hungarian_channel';
    END IF;
    
    -- Hozzuk létre a szlovák csatornát, ha még nem létezik
    IF NOT slovak_exists THEN
        INSERT INTO channel (
            "createdAt", "updatedAt", code, token, description,
            "defaultLanguageCode", "availableLanguageCodes",
            "defaultCurrencyCode", "availableCurrencyCodes",
            "trackInventory", "outOfStockThreshold", "pricesIncludeTax",
            "sellerId", "defaultTaxZoneId", "defaultShippingZoneId"
        )
        SELECT 
            NOW(), NOW(), 'slovak_channel', 'sk_' || default_token, 'Slovenský e-shop',
            'sk', 'sk,en',
            'EUR', 'EUR',
            "trackInventory", "outOfStockThreshold", "pricesIncludeTax",
            "sellerId", (SELECT id FROM zone WHERE name = 'SK-HU Markets'), (SELECT id FROM zone WHERE name = 'SK-HU Markets')
        FROM channel
        WHERE id = default_channel_id;
    ELSE
        -- Ha már létezik, frissítsük a beállításait
        UPDATE channel
        SET 
            "defaultLanguageCode" = 'sk',
            "availableLanguageCodes" = 'sk,en',
            "defaultCurrencyCode" = 'EUR',
            "availableCurrencyCodes" = 'EUR'
        WHERE code = 'slovak_channel';
    END IF;
    
    -- Másoljuk át a termékeket az alapértelmezett csatornából az új csatornákba, ha még nem léteznek
    INSERT INTO product_channels_channel ("productId", "channelId")
    SELECT 
        "productId", 
        (SELECT id FROM channel WHERE code = 'hungarian_channel')
    FROM 
        product_channels_channel
    WHERE 
        "channelId" = default_channel_id
        AND NOT EXISTS (
            SELECT 1 FROM product_channels_channel
            WHERE "channelId" = (SELECT id FROM channel WHERE code = 'hungarian_channel')
            AND "productId" = product_channels_channel."productId"
        );
        
    INSERT INTO product_channels_channel ("productId", "channelId")
    SELECT 
        "productId", 
        (SELECT id FROM channel WHERE code = 'slovak_channel')
    FROM 
        product_channels_channel
    WHERE 
        "channelId" = default_channel_id
        AND NOT EXISTS (
            SELECT 1 FROM product_channels_channel
            WHERE "channelId" = (SELECT id FROM channel WHERE code = 'slovak_channel')
            AND "productId" = product_channels_channel."productId"
        );
    
    -- Másoljuk át a termékváltozatokat az alapértelmezett csatornából az új csatornákba, ha még nem léteznek
    INSERT INTO product_variant_channels_channel ("productVariantId", "channelId")
    SELECT 
        "productVariantId", 
        (SELECT id FROM channel WHERE code = 'hungarian_channel')
    FROM 
        product_variant_channels_channel
    WHERE 
        "channelId" = default_channel_id
        AND NOT EXISTS (
            SELECT 1 FROM product_variant_channels_channel
            WHERE "channelId" = (SELECT id FROM channel WHERE code = 'hungarian_channel')
            AND "productVariantId" = product_variant_channels_channel."productVariantId"
        );
        
    INSERT INTO product_variant_channels_channel ("productVariantId", "channelId")
    SELECT 
        "productVariantId", 
        (SELECT id FROM channel WHERE code = 'slovak_channel')
    FROM 
        product_variant_channels_channel
    WHERE 
        "channelId" = default_channel_id
        AND NOT EXISTS (
            SELECT 1 FROM product_variant_channels_channel
            WHERE "channelId" = (SELECT id FROM channel WHERE code = 'slovak_channel')
            AND "productVariantId" = product_variant_channels_channel."productVariantId"
        );
    
    -- Másoljuk át a gyűjteményeket az alapértelmezett csatornából az új csatornákba
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT 
        "collectionId", 
        (SELECT id FROM channel WHERE code = 'hungarian_channel')
    FROM 
        collection_channels_channel
    WHERE 
        "channelId" = default_channel_id;
        
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT 
        "collectionId", 
        (SELECT id FROM channel WHERE code = 'slovak_channel')
    FROM 
        collection_channels_channel
    WHERE 
        "channelId" = default_channel_id;
    
    -- Másoljuk át a fizetési módokat az alapértelmezett csatornából az új csatornákba, ha még nincsenek átmásolva
    INSERT INTO payment_method_channels_channel ("paymentMethodId", "channelId")
    SELECT 
        "paymentMethodId", 
        (SELECT id FROM channel WHERE code = 'hungarian_channel')
    FROM 
        payment_method_channels_channel
    WHERE 
        "channelId" = default_channel_id
        AND NOT EXISTS (
            SELECT 1 FROM payment_method_channels_channel 
            WHERE "channelId" = (SELECT id FROM channel WHERE code = 'hungarian_channel')
            AND "paymentMethodId" = payment_method_channels_channel."paymentMethodId"
        );
        
    INSERT INTO payment_method_channels_channel ("paymentMethodId", "channelId")
    SELECT 
        "paymentMethodId", 
        (SELECT id FROM channel WHERE code = 'slovak_channel')
    FROM 
        payment_method_channels_channel
    WHERE 
        "channelId" = default_channel_id
        AND NOT EXISTS (
            SELECT 1 FROM payment_method_channels_channel 
            WHERE "channelId" = (SELECT id FROM channel WHERE code = 'slovak_channel')
            AND "paymentMethodId" = payment_method_channels_channel."paymentMethodId"
        );
    
    -- Másoljuk át a szállítási módokat az alapértelmezett csatornából az új csatornákba, ha még nincsenek átmásolva
    INSERT INTO shipping_method_channels_channel ("shippingMethodId", "channelId")
    SELECT 
        "shippingMethodId", 
        (SELECT id FROM channel WHERE code = 'hungarian_channel')
    FROM 
        shipping_method_channels_channel
    WHERE 
        "channelId" = default_channel_id
        AND NOT EXISTS (
            SELECT 1 FROM shipping_method_channels_channel 
            WHERE "channelId" = (SELECT id FROM channel WHERE code = 'hungarian_channel')
            AND "shippingMethodId" = shipping_method_channels_channel."shippingMethodId"
        );
        
    INSERT INTO shipping_method_channels_channel ("shippingMethodId", "channelId")
    SELECT 
        "shippingMethodId", 
        (SELECT id FROM channel WHERE code = 'slovak_channel')
    FROM 
        shipping_method_channels_channel
    WHERE 
        "channelId" = default_channel_id
        AND NOT EXISTS (
            SELECT 1 FROM shipping_method_channels_channel 
            WHERE "channelId" = (SELECT id FROM channel WHERE code = 'slovak_channel')
            AND "shippingMethodId" = shipping_method_channels_channel."shippingMethodId"
        );
        
    -- Másoljuk át a szerepköröket az alapértelmezett csatornából az új csatornákba, ha még nincsenek átmásolva
    INSERT INTO role_channels_channel ("roleId", "channelId")
    SELECT 
        "roleId", 
        (SELECT id FROM channel WHERE code = 'hungarian_channel')
    FROM 
        role_channels_channel
    WHERE 
        "channelId" = default_channel_id
        AND NOT EXISTS (
            SELECT 1 FROM role_channels_channel 
            WHERE "channelId" = (SELECT id FROM channel WHERE code = 'hungarian_channel')
            AND "roleId" = role_channels_channel."roleId"
        );
        
    INSERT INTO role_channels_channel ("roleId", "channelId")
    SELECT 
        "roleId", 
        (SELECT id FROM channel WHERE code = 'slovak_channel')
    FROM 
        role_channels_channel
    WHERE 
        "channelId" = default_channel_id
        AND NOT EXISTS (
            SELECT 1 FROM role_channels_channel 
            WHERE "channelId" = (SELECT id FROM channel WHERE code = 'slovak_channel')
            AND "roleId" = role_channels_channel."roleId"
        );
        
    -- Másoljuk át a facet értékeket az alapértelmezett csatornából az új csatornákba
    INSERT INTO facet_channels_channel ("facetId", "channelId")
    SELECT 
        "facetId", 
        (SELECT id FROM channel WHERE code = 'hungarian_channel')
    FROM 
        facet_channels_channel
    WHERE 
        "channelId" = default_channel_id;
        
    INSERT INTO facet_channels_channel ("facetId", "channelId")
    SELECT 
        "facetId", 
        (SELECT id FROM channel WHERE code = 'slovak_channel')
    FROM 
        facet_channels_channel
    WHERE 
        "channelId" = default_channel_id;
    
    -- Másoljuk át a facet értékeket az alapértelmezett csatornából az új csatornákba
    INSERT INTO facet_value_channels_channel ("facetValueId", "channelId")
    SELECT 
        "facetValueId", 
        (SELECT id FROM channel WHERE code = 'hungarian_channel')
    FROM 
        facet_value_channels_channel
    WHERE 
        "channelId" = default_channel_id;
        
    INSERT INTO facet_value_channels_channel ("facetValueId", "channelId")
    SELECT 
        "facetValueId", 
        (SELECT id FROM channel WHERE code = 'slovak_channel')
    FROM 
        facet_value_channels_channel
    WHERE 
        "channelId" = default_channel_id;
    
    -- Másoljuk át az asset-eket az alapértelmezett csatornából az új csatornákba
    INSERT INTO asset_channels_channel ("assetId", "channelId")
    SELECT 
        "assetId", 
        (SELECT id FROM channel WHERE code = 'hungarian_channel')
    FROM 
        asset_channels_channel
    WHERE 
        "channelId" = default_channel_id;
        
    INSERT INTO asset_channels_channel ("assetId", "channelId")
    SELECT 
        "assetId", 
        (SELECT id FROM channel WHERE code = 'slovak')
    FROM 
        asset_channels_channel
    WHERE 
        "channelId" = default_channel_id;
    
    -- Másoljuk át a készlethelyek adatait az alapértelmezett csatornából az új csatornákba
    INSERT INTO stock_location_channels_channel ("stockLocationId", "channelId")
    SELECT 
        "stockLocationId", 
        (SELECT id FROM channel WHERE code = 'hungarian_channel')
    FROM 
        stock_location_channels_channel
    WHERE 
        "channelId" = default_channel_id;
        
    INSERT INTO stock_location_channels_channel ("stockLocationId", "channelId")
    SELECT 
        "stockLocationId", 
        (SELECT id FROM channel WHERE code = 'slovak_channel')
    FROM 
        stock_location_channels_channel
    WHERE 
        "channelId" = default_channel_id;
    
    -- Állítsuk be a magyar adókulcsot a magyar csatornához
    UPDATE tax_rate 
    SET "zoneId" = (SELECT id FROM zone WHERE name = 'SK-HU Markets')
    WHERE name = 'HU standard VAT 27%';
    
    -- Állítsuk be a szlovák adókulcsot a szlovák csatornához
    UPDATE tax_rate 
    SET "zoneId" = (SELECT id FROM zone WHERE name = 'SK-HU Markets')
    WHERE name = 'SK standard VAT 20%';
    
    -- Frissítsük az aktív csatornát a magyar csatornára
    UPDATE session 
    SET "activeChannelId" = (SELECT id FROM channel WHERE code = 'hungarian_channel')
    WHERE type = 'AuthenticatedSession';
    
END$$;

-- Ellenőrizzük a létrehozott csatornákat
SELECT id, code, description, "defaultLanguageCode", "defaultCurrencyCode" FROM channel;

-- Ellenőrizzük az aktív csatornát a munkamenetben
SELECT s.id, s.token, s.type, s."activeChannelId", c.code 
FROM session s 
LEFT JOIN channel c ON s."activeChannelId" = c.id 
WHERE s.type = 'AuthenticatedSession';
