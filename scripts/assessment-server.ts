import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import handler from '../api/assessment';
const root = resolve('visibility-engine-assessment/dist-vercel');
const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff' };
createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (url.pathname === '/api/assessment') {
    let length = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      length += chunk.length;
      if (length > 16384) { res.writeHead(413); res.end(); return; }
      chunks.push(chunk);
    }
    let body;
    try { body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined; }
    catch { res.writeHead(400); res.end(); return; }
    Object.assign(req, { body, query: Object.fromEntries(url.searchParams) });
    Object.assign(res, { status(code: number) { res.statusCode = code; return res; }, json(value: unknown) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); } });
    await handler(req, res);
    return;
  }
  try {
    const pathname = decodeURIComponent(url.pathname);
    const file = pathname === '/' || pathname === '/admin' || pathname === '/admin/' ? resolve(root, 'index.html') : resolve(root, '.' + pathname);
    if (!file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    const contents = await readFile(file);
    res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(contents);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(Number(process.env.PORT || 4174), '127.0.0.1', () => console.log('Assessment and admin available on http://127.0.0.1:' + (process.env.PORT || 4174)));
