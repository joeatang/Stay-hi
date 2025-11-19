#!/usr/bin/env node
// Hi Beacon Local Collector
// Minimal HTTP server to collect perf/error/integrity/track beacons for local analysis.
// Usage: node scripts/beacon-server.js [port]

const http = require('http');
const fs = require('fs');
const path = require('path');

const port = parseInt(process.argv[2],10) || 5050;
const logDir = path.join(process.cwd(), 'beacon-logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

function append(file, obj){
  try {
    fs.appendFileSync(path.join(logDir,file), JSON.stringify(obj) + '\n');
  } catch (e){
    console.error('Log append failed', file, e.message);
  }
}

function send(res, code, body){
  res.writeHead(code, { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' });
  res.end(JSON.stringify(body));
}

function parseBody(req){
  return new Promise(resolve => {
    let data='';
    req.on('data', chunk => { data += chunk; if (data.length > 1e6) req.connection.destroy(); });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch { resolve({ _raw: data }); }
    });
  });
}

const server = http.createServer(async (req,res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'OPTIONS') { // simple CORS
    res.writeHead(204, { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,GET,OPTIONS','Access-Control-Allow-Headers':'Content-Type' });
    return res.end();
  }
  if (req.method === 'GET' && url.pathname === '/') {
    return send(res,200,{ status:'ok', endpoints:['/perf-beacon','/error-beacon','/integrity-beacon','/track-beacon'], logDir });
  }
  const ts = Date.now();
  if (req.method === 'POST' && ['/perf-beacon','/error-beacon','/integrity-beacon','/track-beacon'].includes(url.pathname)) {
    const body = await parseBody(req);
    const entry = { ts, path: url.pathname, body };
    const fileMap = {
      '/perf-beacon':'perf.log',
      '/error-beacon':'error.log',
      '/integrity-beacon':'integrity.log',
      '/track-beacon':'track.log'
    };
    append(fileMap[url.pathname], entry);
    return send(res, 202, { accepted:true });
  }
  send(res,404,{ error:'Not Found' });
});

server.listen(port, () => {
  console.log(`🚀 Hi Beacon Collector listening on http://localhost:${port}`);
  console.log('Logs directory:', logDir);
});
