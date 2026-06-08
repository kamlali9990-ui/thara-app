const wp = require('web-push');
const keys = wp.generateVAPIDKeys();
console.log('PUBLIC:' + keys.publicKey);
console.log('PRIVATE:' + keys.privateKey);
