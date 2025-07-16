---
trigger: always_on
---

a helyzet a kovetkezo 

1. ez a rendszer Railwayon van futtatva es "production" környezetben - a celja hogy a railwayon való futást letrehozzuk es teszteljük

 a fenti ok miatt  az osszes .env parameter file nem jatszik  - ezek azert vannak csak hogy osszegyüjtsuk milyen parametereink vannak egyaltalan 
 a @railwai_MCP serverrel tudod lekerni a valtozokat tehat accessed van a jelen project railway kornyezetehez. Ezert kerdesek es feltetelezések helyett ezt hasznald kerlek . 


2. az admin felulet egy aldomainen  erheto el https://admin.need-shit.fun/admin/
a backendhez egyszerre ket  storefront webaruhaz is tartozik
1.hu.need-shit.fun ez a magyar valtozat 
2.sh.need-shit.fun ez a szlovak valtozat 
a backendben a ket webaruhazat egybe kezeljuk de a storefrontok elkulönitése erdekében ket channel all a hatterben 
 -hungarian_channel
 -slovak_channel
a https://need-shit.fun url en nincs semmi mert a domain maintainer nem enged meg ilyet bejegyezni .

3. fájlok módosításánál preferálom a replace_file_content eszközt, amely lehetővé teszi, hogy a változtatásokat a szerkesztőben lássam és jóváhagyjam.
4. Az enviroment parameterek kezelése: Default értékre való visszaesések (fallbackok) kerülése.
  pl.
         const serverPort = +process.env.PORT! || 3000; /
   helyett mindig adjon hibát ha nincs deklaralva a paraméter 
          if (!process.env.PORT) {
                throw new Error('PORT környezeti változó nincs beállítva!');
          }

4. az sqleket is a railwayen kell futtatni pl 
PGPASSWORD=iiTXwbZNrwJnJoXHJmHQBlkPZkCNkVvG psql -h shinkansen.proxy.rlwy.net -p 46715 -U postgres -d vendure -f /home/csaba/git/vendure-default/db_backups/04_vendure_channels.sql