-- Vendure személyre szabás: Csak Magyarország (HU) marad engedélyezve, minden más ország letiltva
-- Készítve: 2025-07-02

-- Duplikált országrekordok törlése (minden országkódhoz csak a legalacsonyabb ID-jű rekordot tartjuk meg)
DELETE FROM region
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY code ORDER BY id) as row_num
        FROM region
        WHERE type = 'country'
    ) t
    WHERE t.row_num > 1
);

-- Minden ország letiltása, kivéve Magyarország (HU) és Szlovákia (SK)
UPDATE region SET enabled = false WHERE type = 'country';
UPDATE region SET enabled = true WHERE code IN ('HU', 'SK');

-- Pénznem módosítása USD-ről EUR-ra (szlovák cég alapértelmezett pénzneme)
-- Csak az alapértelmezett csatornát módosítjuk
UPDATE channel SET 
    "defaultCurrencyCode" = 'EUR',
    "availableCurrencyCodes" = 'EUR'
WHERE code = '__default_channel__';

-- Magyar és angol nyelv beállítása
-- Csak az alapértelmezett csatornát módosítjuk
UPDATE channel SET 
    "defaultLanguageCode" = 'hu',
    "availableLanguageCodes" = 'hu,en,sk'
WHERE code = '__default_channel__';

-- Csak az európai zóna megtartása
DELETE FROM zone_members_region WHERE "zoneId" NOT IN (SELECT id FROM zone WHERE name = 'Europe');
-- A zónák törlése előtt törölni kell a hivatkozó tax_rate rekordokat
DELETE FROM tax_rate WHERE "zoneId" IN (SELECT id FROM zone WHERE name != 'Europe');
DELETE FROM zone WHERE name != 'Europe';

-- Töröljük az Európán kívüli országokat
DELETE FROM region WHERE type = 'country' AND id NOT IN (SELECT "regionId" FROM zone_members_region WHERE "zoneId" = (SELECT id FROM zone WHERE name = 'Europe'));

-- Hozzunk létre egy új zónát a fő piacoknak (Szlovákia és Magyarország)
INSERT INTO zone ("createdAt", "updatedAt", name) VALUES (NOW(), NOW(), 'SK-HU Markets');

-- Adjuk hozzá Szlovákiát és Magyarországot az új zónához
INSERT INTO zone_members_region ("zoneId", "regionId")
SELECT 
    (SELECT id FROM zone WHERE name = 'SK-HU Markets'),
    id
FROM region
WHERE code IN ('SK', 'HU');

-- Árak tartalmazzák az adót (EU-ban jellemző)
UPDATE channel SET "pricesIncludeTax" = true;

-- Állítsuk be az alapértelmezett adózási és szállítási zónát
UPDATE channel SET 
    "defaultTaxZoneId" = (SELECT id FROM zone WHERE name = 'SK-HU Markets'),
    "defaultShippingZoneId" = (SELECT id FROM zone WHERE name = 'SK-HU Markets');

-- Szlovák ÁFA kulcsok beállítása
-- Először töröljük a meglévő adókulcsokat
DELETE FROM tax_rate;

-- Hozzunk létre egy új adókategóriát a standard termékekhez
INSERT INTO tax_category ("createdAt", "updatedAt", name) 
VALUES (NOW(), NOW(), 'Standard Rate');

-- Szlovák standard ÁFA (20%)
INSERT INTO tax_rate ("createdAt", "updatedAt", name, enabled, value, "categoryId", "zoneId", "customerGroupId")
VALUES (
    NOW(), NOW(), 'SK standard VAT 20%', true, 20, 
    (SELECT id FROM tax_category WHERE name = 'Standard Rate'),
    (SELECT id FROM zone WHERE name = 'SK-HU Markets'),
    NULL
);

-- Magyar standard ÁFA (27%)
INSERT INTO tax_rate ("createdAt", "updatedAt", name, enabled, value, "categoryId", "zoneId", "customerGroupId")
VALUES (
    NOW(), NOW(), 'HU standard VAT 27%', true, 27, 
    (SELECT id FROM tax_category WHERE name = 'Standard Rate'),
    (SELECT id FROM zone WHERE name = 'Europe'),
    NULL
);

-- Magyarország és Szlovákia engedélyezése (biztonsági okokból, ha esetleg le lennének tiltva)
UPDATE region
SET enabled = true
WHERE code IN ('HU', 'SK');
