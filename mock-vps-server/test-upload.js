const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Valódi képfájl használata a teszteléshez
const testFilePath = path.join(__dirname, '../static/assets/preview/2f/legion1__preview.jpg');

// Ellenőrizzük, hogy létezik-e a fájl
if (!fs.existsSync(testFilePath)) {
    console.error(`A fájl nem található: ${testFilePath}`);
    process.exit(1);
}

console.log(`Teszt fájl: ${testFilePath}`);
console.log(`Fájlméret: ${(fs.statSync(testFilePath).size / 1024).toFixed(2)} KB`);

// FormData objektum létrehozása
const form = new FormData();
form.append('file', fs.createReadStream(testFilePath), 'legion1_test.jpg');

// VPS URL - valódi VPS szerver
const VPS_URL = 'http://91.99.75.89:3000/upload';
console.log(`Feltöltés a valódi VPS szerverre: ${VPS_URL}`);

// Feltöltés a valódi VPS szerverre
axios.post(VPS_URL, form, {
    headers: form.getHeaders(),
    timeout: 10000
    // HTTP protokollt használunk, nincs szükség httpsAgent-re
})
.then(response => {
    console.log('Sikeres feltöltés!');
    console.log('Válasz:', response.data);
})
.catch(error => {
    console.error('Hiba történt a feltöltés során:', error.message);
    if (error.response) {
        console.error('Szerver válasz:', error.response.data);
    }
});
