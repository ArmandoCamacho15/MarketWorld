const crypto = require('crypto');
const https = require('https');

const urls = [
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.css',
    'https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.js',
    'https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/locales/es.min.js'
];

async function getSRI(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                // Handle redirect
                return getSRI(res.headers.location).then(resolve).catch(reject);
            }
            let data = Buffer.alloc(0);
            res.on('data', (chunk) => {
                data = Buffer.concat([data, chunk]);
            });
            res.on('end', () => {
                const hash = crypto.createHash('sha384').update(data).digest('base64');
                resolve(`sha384-${hash}`);
            });
        }).on('error', reject);
    });
}

async function run() {
    for (const url of urls) {
        try {
            const sri = await getSRI(url);
            console.log(`${url} | ${sri}`);
        } catch (e) {
            console.error(`Error with ${url}: ${e.message}`);
        }
    }
}

run();
