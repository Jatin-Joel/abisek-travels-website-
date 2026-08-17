const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.webp': 'image/webp',
    '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
    // Convert URL path to local file path
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    
    // Resolve extension
    const ext = path.extname(filePath).toLowerCase();
    let contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    // Safety check - prevent directory traversal outside workspace
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT' || error.code === 'EISDIR') {
                // If it's a directory or does not exist, try index.html
                const indexFallbackPath = path.join(filePath, 'index.html');
                fs.readFile(indexFallbackPath, (fallbackError, fallbackContent) => {
                    if (fallbackError) {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end('<h1>404 Not Found</h1><p>The requested file could not be found.</p>');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(fallbackContent, 'utf-8');
                    }
                });
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`500 Internal Server Error: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`===================================================`);
    console.log(`  Abisek Travels Taxi Landing Page is running!`);
    console.log(`  Local URL: http://localhost:${PORT}/`);
    console.log(`===================================================`);
});
