const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const basicAuth = require('express-basic-auth');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 10000;

let qrString = null;
let isConnected = false;

// তোমার নাম আর লগইন সিকিউরিটি - এখানে পরিবর্তন করবে
const SITE_NAME = "WhatsApp QR - YOUR NAME"; // এখানে তোমার নাম দাও
const AUTH_USER = process.env.AUTH_USER || "admin";
const AUTH_PASS = process.env.AUTH_PASS || "laboni123";

app.use(basicAuth({
  users: { [AUTH_USER]: AUTH_PASS },
  challenge: true
}));

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if(qr) {
      qrString = await QRCode.toDataURL(qr);
    }
    if(connection === 'open') {
      isConnected = true;
      qrString = null;
      console.log("System Operational");
    }
    if(connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if(shouldReconnect) startSock();
      else isConnected = false;
    }
  });
  sock.ev.on('creds.update', saveCreds);
}

app.get('/', async (req, res) => {
  if(isConnected) {
    return res.send(`
      <div style="text-align:center; margin-top:100px; font-family:sans-serif">
        <h1>✅ System Operational</h1>
        <p>WhatsApp Connected Successfully!</p>
        <p>${SITE_NAME}</p>
      </div>
    `);
  }
  if(qrString) {
    res.send(`
      <div style="text-align:center; margin-top:50px; font-family:sans-serif">
        <h2>${SITE_NAME}</h2>
        <img src="${qrString}" style="width:300px; border:10px solid #fff; box-shadow:0 0 20px #ccc"/>
        <p>WhatsApp > Linked Devices > Link a Device দিয়ে স্ক্যান করুন</p>
        <script>setTimeout(()=>location.reload(), 20000)</script>
      </div>
    `);
  } else {
    res.send(`<h2 style="text-align:center; margin-top:100px">QR Generating... Please wait, reload page</h2>`);
  }
});

startSock();
app.listen(PORT, () => console.log("Server running on", PORT));
