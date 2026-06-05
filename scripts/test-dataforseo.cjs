const https = require('https');

const postData = JSON.stringify([
  {
    keyword: 'عصير برتقال المراعي',
    language_code: 'ar',
    location_code: 2682
  }
]);

const options = {
  hostname: 'api.dataforseo.com',
  path: '/v3/serp/google/images/live/advanced',
  method: 'POST',
  headers: {
    'Authorization': 'Basic a2FtbGFsaTk5OTBAZ21haWwuY29tOmRmZDM3NWQ2ODY1MjIwYjE=',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(JSON.stringify(JSON.parse(data), null, 2)));
});

req.on('error', (e) => console.error(e));
req.write(postData);
req.end();
