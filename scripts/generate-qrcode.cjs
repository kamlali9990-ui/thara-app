const QRCode = require('qrcode');
const path = require('path');

const APP_URL = 'https://kamlali9990-ui.github.io/thara-app/';
const OUT = path.resolve(__dirname, '..', 'public', 'qr-code.png');

QRCode.toFile(OUT, APP_URL, {
  type: 'png',
  width: 600,
  margin: 2,
  color: { dark: '#127443', light: '#FFFFFF' }
}).then(() => console.log('QR code generated:', OUT))
  .catch(err => { console.error(err); process.exit(1); });
