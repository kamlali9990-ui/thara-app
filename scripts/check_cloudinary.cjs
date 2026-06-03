const https = require('https');
const PAT = 'sbp_04640e51a602f3e9b564d5d334967ac49a87e454';
const REF = 'oqwphazzuxmrxwbnothk';
function api(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'api.supabase.com', path, headers: { 'Authorization': 'Bearer ' + PAT } }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { if (res.statusCode >= 400) reject(new Error(res.statusCode + ': ' + d)); else resolve(d); }); });
    req.on('error', reject);
    req.end();
  });
}
(async () => {
  const raw = await api('/v1/projects/' + REF + '/secrets');
  const secrets = JSON.parse(raw);
  for (const s of secrets) {
    if (s.name.startsWith('CLOUDINARY_')) {
      console.log(s.name + ' = ' + (s.value || '(empty)'));
    }
  }
})();
