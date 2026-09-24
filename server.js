#!/usr/bin/env node
/**
 * Local preview server (zero dependencies).
 *
 *   npm start   →  http://localhost:4173
 *
 * Serves ./dist and mimics the production form backend: POST requests to
 * "/" (or /thank-you/) are parsed and appended to
 * ./.submissions/submissions.jsonl, uploaded photos are saved next to it.
 * This lets you test the full contact flow locally.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 4173;
const DIST = path.join(__dirname, 'dist');
const OUT = path.join(__dirname, '.submissions');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon',
};

function parseMultipart(buf, boundary) {
  const fields = {}, files = [];
  const sep = Buffer.from('--' + boundary);
  let pos = buf.indexOf(sep) + sep.length;
  while (pos > sep.length - 1 && pos < buf.length) {
    const next = buf.indexOf(sep, pos);
    if (next < 0) break;
    const part = buf.slice(pos + 2, next - 2); // strip CRLFs
    pos = next + sep.length;
    const headEnd = part.indexOf('\r\n\r\n');
    if (headEnd < 0) continue;
    const head = part.slice(0, headEnd).toString();
    const body = part.slice(headEnd + 4);
    const name = (head.match(/name="([^"]*)"/) || [])[1];
    const filename = (head.match(/filename="([^"]*)"/) || [])[1];
    if (!name) continue;
    if (filename !== undefined) {
      if (filename && body.length) files.push({ field: name, filename, data: body });
    } else fields[name] = body.toString();
  }
  return { fields, files };
}

function handlePost(req, res) {
  const chunks = [];
  let size = 0;
  req.on('data', (c) => {
    size += c.length;
    if (size > 12 * 1024 * 1024) { res.writeHead(413); res.end('Payload too large'); req.destroy(); }
    else chunks.push(c);
  });
  req.on('end', () => {
    const buf = Buffer.concat(chunks);
    const type = req.headers['content-type'] || '';
    let fields = {}, files = [];
    if (type.includes('multipart/form-data')) {
      ({ fields, files } = parseMultipart(buf, type.split('boundary=')[1]));
    } else {
      fields = Object.fromEntries(new URLSearchParams(buf.toString()));
    }
    if (fields.company_website) { res.writeHead(200); return res.end('ok'); } // honeypot
    fs.mkdirSync(OUT, { recursive: true });
    const id = new Date().toISOString().replace(/[:.]/g, '-');
    const saved = files.map((f, i) => {
      const name = `${id}-${i + 1}-${f.filename.replace(/[^\w.-]+/g, '_')}`;
      fs.writeFileSync(path.join(OUT, name), f.data);
      return name;
    });
    const record = { received_at: new Date().toISOString(), ...fields, photos: saved };
    fs.appendFileSync(path.join(OUT, 'submissions.jsonl'), JSON.stringify(record) + '\n');
    console.log('📨  Form submission:', JSON.stringify(record));
    if ((req.headers.accept || '').includes('application/json')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true }));
    }
    res.writeHead(303, { Location: '/thank-you/' });
    res.end();
  });
}

http
  .createServer((req, res) => {
    if (req.method === 'POST') return handlePost(req, res);
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    let file = path.join(DIST, path.normalize(p));
    if (!file.startsWith(DIST)) { res.writeHead(403); return res.end(); }
    if (!fs.existsSync(file) && fs.existsSync(file + '/index.html')) {
      res.writeHead(301, { Location: p + '/' });
      return res.end();
    }
    if (!fs.existsSync(file)) {
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      return fs.createReadStream(path.join(DIST, '404.html')).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`Botwin preview → http://localhost:${PORT}`));
