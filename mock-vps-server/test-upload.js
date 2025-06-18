const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Létrehozunk egy teszt fájlt
const testFilePath = path.join(__dirname, 'test-image.txt');
fs.writeFileSync(testFilePath, 'Ez egy teszt fájl az asset szinkronizáció teszteléséhez.');

// FormData objektum létrehozása
const formData = new FormData();
formData.append('file', fs.createReadStream(testFilePath), 'test-image.txt');

// Feltöltés a mock VPS szerverre
console.log('Teszt fájl feltöltése a mock VPS szerverre...');
axios.post('http://localhost:3030/upload', formData, {
    headers: formData.getHeaders(),
    timeout: 5000
})
.then(response => {
    console.log('Sikeres feltöltés!');
    console.log('Válasz:', response.data);
})
.catch(error => {
    console.error('Hiba történt a feltöltés során:', error.message);
});
