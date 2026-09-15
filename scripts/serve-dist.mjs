// Local build verification at /, /Cleaning/, and /Cleaning/index.html. No public hosting.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
createServer(async(request,response)=>{
  try {
    let pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    if(pathname==='/Cleaning') {response.writeHead(302,{Location:'/Cleaning/'}).end();return;}
    if(pathname.startsWith('/Cleaning/')) pathname=pathname.slice('/Cleaning'.length);
    if(pathname==='/') pathname='/index.html';
    const path=resolve(root,'.'+pathname);
    if(!path.startsWith(root+sep)||(await stat(path)).isDirectory()) throw new Error('Not found');
    response.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});
    response.end(await readFile(path));
  } catch {response.writeHead(404).end('Not found');}
}).listen(4173,'127.0.0.1',()=>console.log('Local build review: http://127.0.0.1:4173/Cleaning/'));
