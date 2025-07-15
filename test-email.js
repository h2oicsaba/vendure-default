// Egyszerű email küldési teszt a nodemailer-rel
const nodemailer = require('nodemailer');

// Ugyanazok a beállítások, mint a Python példában
const smtp_host = 'smtp.forpsi.com';
const smtp_port = 587;
const smtp_user = 'noreply@need-shit.fun';
const smtp_pass = 'Zsolika22-';  // Figyelem: Éles környezetben ne hardkódold a jelszót!

const from_addr = '"Vendure Store" <noreply@need-shit.fun>';
const to_addr = 'csaba.vizi@gmail.com';  // Ide érkezik a teszt email

// Létrehozzuk a transport objektumot
const transporter = nodemailer.createTransport({
    host: smtp_host,
    port: smtp_port,
    auth: {
        user: smtp_user,
        pass: smtp_pass
    },
    debug: true,
    logger: true
});

// Először teszteljük a kapcsolatot
console.log('SMTP kapcsolat tesztelése...');
transporter.verify(function(error, success) {
    if (error) {
        console.error('SMTP kapcsolat hiba:', error);
    } else {
        console.log('SMTP szerver kész az emailek fogadására:', success);
        
        // Ha a kapcsolat működik, küldünk egy teszt emailt
        console.log('Teszt email küldése...');
        transporter.sendMail({
            from: from_addr,
            to: to_addr,
            subject: 'Teszt Nodemailer SMTP',
            text: 'Ez egy teszt üzenet Nodemailer-rel. Ékezetes betűk: ő, ű, á, é, ó, ü.',
            html: '<p>Ez egy <b>HTML</b> teszt üzenet Nodemailer-rel. Ékezetes betűk: ő, ű, á, é, ó, ü.</p>'
        }, (err, info) => {
            if (err) {
                console.error('Email küldési hiba:', err);
            } else {
                console.log('Email sikeresen elküldve:', info);
            }
        });
    }
});

// Explicit STARTTLS teszt
console.log('STARTTLS teszt...');
const starttlsTransporter = nodemailer.createTransport({
    host: smtp_host,
    port: smtp_port,
    auth: {
        user: smtp_user,
        pass: smtp_pass
    },
    secure: false,
    requireTLS: true,
    debug: true,
    logger: true
});

starttlsTransporter.verify(function(error, success) {
    if (error) {
        console.error('STARTTLS SMTP kapcsolat hiba:', error);
    } else {
        console.log('STARTTLS SMTP szerver kész az emailek fogadására:', success);
        
        // Ha a kapcsolat működik, küldünk egy teszt emailt
        console.log('STARTTLS teszt email küldése...');
        starttlsTransporter.sendMail({
            from: from_addr,
            to: to_addr,
            subject: 'Teszt Nodemailer STARTTLS',
            text: 'Ez egy teszt üzenet Nodemailer-rel STARTTLS használatával. Ékezetes betűk: ő, ű, á, é, ó, ü.',
            html: '<p>Ez egy <b>HTML</b> teszt üzenet Nodemailer-rel STARTTLS használatával. Ékezetes betűk: ő, ű, á, é, ó, ü.</p>'
        }, (err, info) => {
            if (err) {
                console.error('STARTTLS email küldési hiba:', err);
            } else {
                console.log('STARTTLS email sikeresen elküldve:', info);
            }
        });
    }
});
