import './build.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
const html = await readFile(new URL('../dist/index.html', import.meta.url));
const port = Number(process.env.PORT || 4173);
const server = http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405);
    res.end();
    return;
  }
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (!['/', '/index.html'].includes(pathname)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(req.method === 'HEAD' ? undefined : html);
});
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`));
server.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
