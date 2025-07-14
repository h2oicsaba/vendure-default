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

-- Ellenőrizzük a termékek láthatósági beállításait
SELECT 
    p.id, 
    p.enabled, 
    p."deletedAt",
    c.code AS channel_code
FROM 
    product p
JOIN 
    product_channels_channel pc ON p.id = pc."productId"
JOIN 
    channel c ON pc."channelId" = c.id
LIMIT 10;

-- Ellenőrizzük az admin felhasználó jogosultságait és csatorna hozzáféréseit
SELECT 
    a.id, 
    a.identifier AS admin_email,
    r.code AS role_code,
    c.code AS channel_code
FROM 
    administrator a
JOIN 
    administrator_roles_role arr ON a.id = arr."administratorId"
JOIN 
    role r ON arr."roleId" = r.id
JOIN 
    role_channels_channel rcc ON r.id = rcc."roleId"
JOIN 
    channel c ON rcc."channelId" = c.id;
