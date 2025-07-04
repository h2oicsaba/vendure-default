---
trigger: manual
---

1. fájlok módosításánál preferálom a replace_file_content eszközt, amely lehetővé teszi, hogy a változtatásokat a szerkesztőben lássam és jóváhagyjam.
2. Az enviroment parameterek kezelése: Default értékre való visszaesések (fallbackok) kerülése.
  pl.
         const serverPort = +process.env.PORT! || 3000; /
   helyett mindig adjon hibát ha nincs deklaralva a paraméter 
          if (!process.env.PORT) {
                throw new Error('PORT környezeti változó nincs beállítva!');
          }
3. az eles rendszer Railwayon megy innen a @railwai_MCP serverrel tudod lekerni a valtozokat 
4. az sqleket is a railwayen kell futtatni pl 
PGPASSWORD=iiTXwbZNrwJnJoXHJmHQBlkPZkCNkVvG psql -h shinkansen.proxy.rlwy.net -p 46715 -U postgres -d vendure -f /home/csaba/git/vendure-default/db_backups/04_vendure_channels.sql