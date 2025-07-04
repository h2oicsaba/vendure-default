-- 10. Vendure csatornák ellenőrzése
-- Ez a szkript ellenőrzi, hogy a csatornák megfelelően vannak-e beállítva

-- 1. Ellenőrizzük a csatornákat
SELECT id, code, token, "defaultLanguageCode", "availableLanguageCodes" FROM channel;

-- 2. Ellenőrizzük, hogy mely csatornákhoz vannak termékek rendelve
SELECT c.code, COUNT(pc."productId") as product_count
FROM channel c
LEFT JOIN product_channels_channel pc ON c.id = pc."channelId"
GROUP BY c.code;

-- 3. Ellenőrizzük az aktív csatornát a munkamenetben
SELECT s.id, s.token, s.type, s."activeChannelId", c.code 
FROM session s 
LEFT JOIN channel c ON s."activeChannelId" = c.id 
WHERE s.type = 'AuthenticatedSession';

-- 4. Ellenőrizzük a termékfordításokat
SELECT "languageCode", COUNT(*) FROM product_translation GROUP BY "languageCode";

-- 5. Ellenőrizzük a termékváltozat-fordításokat
SELECT "languageCode", COUNT(*) FROM product_variant_translation GROUP BY "languageCode";

-- 6. Ellenőrizzük a global_settings táblát
SELECT * FROM global_settings;
