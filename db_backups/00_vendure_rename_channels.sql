-- 00. Csatorna kódok átnevezése
-- Ez a szkript átnevezi a csatorna kódokat a megfelelő formátumra

-- Ellenőrizzük a jelenlegi csatornákat
SELECT id, code, token FROM channel;

-- Átnevezzük a magyar csatornát 'hungarian'-ról 'hungarian_channel'-re
UPDATE channel
SET code = 'hungarian_channel'
WHERE code = 'hungarian';

-- Átnevezzük a szlovák csatornát 'slovak'-ról 'slovak_channel'-re
UPDATE channel
SET code = 'slovak_channel'
WHERE code = 'slovak';

-- Ellenőrizzük az eredményt
SELECT id, code, token FROM channel;
