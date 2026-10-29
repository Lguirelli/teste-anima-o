import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.md':'text/plain; charset=utf-8','.jsx':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{try{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root)){res.writeHead(403).end();return;}
  const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);
}catch{res.writeHead(404).end('Arquivo não encontrado');}});
// Let Windows choose a free port by default; PORT can pin a specific port.
server.on('error',error=>{console.error('Não foi possível abrir o servidor local:',error.message);process.exitCode=1;});
server.listen(Number(process.env.PORT||0),'127.0.0.1',()=>console.log('Web Motion Library: http://127.0.0.1:'+server.address().port));
