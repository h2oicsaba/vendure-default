-- 08. Aktív csatorna beállítása az admin felületen

-- Ellenőrizzük a jelenlegi aktív csatornát
SELECT s.id, s.token, s.type, s."activeChannelId", c.code 
FROM session s 
LEFT JOIN channel c ON s."activeChannelId" = c.id 
WHERE s.type = 'AuthenticatedSession';

-- Állítsuk át az aktív csatornát a magyar csatornára
UPDATE session 
SET "activeChannelId" = (SELECT id FROM channel WHERE code = 'hungarian_channel')
WHERE type = 'AuthenticatedSession';

-- Ellenőrizzük a módosítást
SELECT s.id, s.token, s.type, s."activeChannelId", c.code 
FROM session s 
LEFT JOIN channel c ON s."activeChannelId" = c.id 
WHERE s.type = 'AuthenticatedSession';
