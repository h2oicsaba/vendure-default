import { Injectable } from '@nestjs/common';

/**
 * Ez a szolgáltatás nem szükséges a csatorna szűréshez, mivel a plugin konfigurációban
 * a defaultChannelToken null-ra állításával megakadályozzuk, hogy az alapértelmezett
 * csatorna termékei megjelenjenek más csatornákban.
 * 
 * A Vendure API-ja specifikus, és a getChannelFromToken metódus felülírása típushibákhoz
 * vezetett, ezért inkább a konfigurációs megközelítést választjuk.
 */
@Injectable()
export class ChannelFilterService {
    // Üres szolgáltatás, mivel a plugin konfigurációban megoldjuk a problémát
}
