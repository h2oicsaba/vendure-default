const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Létrehozzuk az uploads könyvtárat, ha még nem létezik
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Beállítjuk a tárolást
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });
const app = express();

// Feltöltési végpont
app.post('/upload', upload.single('file'), (req, res) => {
    console.log('Fájl feltöltve:', req.file.originalname);
    res.status(200).json({
        success: true,
        message: 'Fájl sikeresen feltöltve',
        file: req.file.originalname
    });
});

// Statikus fájlok kiszolgálása az uploads könyvtárból
app.use('/files', express.static(uploadsDir));

// Egyszerű főoldal
app.get('/', (req, res) => {
    res.send(`
        <h1>Mock VPS Szerver</h1>
        <p>Ez egy egyszerű szerver a VPS asset szinkronizációs plugin teszteléséhez.</p>
        <p>A feltöltött fájlok itt érhetők el: <a href="/files">/files</a></p>
    `);
});

// Indítjuk a szervert
const PORT = 3030;
app.listen(PORT, () => {
    console.log(`Mock VPS szerver fut: http://localhost:${PORT}`);
    console.log(`Feltöltési végpont: http://localhost:${PORT}/upload`);
    console.log(`Feltöltött fájlok: http://localhost:${PORT}/files`);
});
