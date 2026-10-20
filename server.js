const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server,{maxHttpBufferSize:1e6, cors:{origin:false}});
app.get('/', (req,res)=>res.sendFile(path.join(__dirname,'index.html')));
app.get('/health', (req,res)=>res.status(200).send('ok'));
app.get('/index.html', (req,res)=>res.sendFile(path.join(__dirname,'index.html')));
const rooms=new Map();
function leave(socket){
 const code=socket.data.code;
 if(!code)return;
 const r=rooms.get(code);
 socket.leave(code);socket.data.code=null;
 if(r){io.to(code).emit('peerLeft');rooms.delete(code);for(const id of [r.host,r.guest]){const s=io.sockets.sockets.get(id);if(s){s.leave(code);s.data.code=null}}}
}
function code(){let s;do{s=Math.random().toString(36).slice(2,8).toUpperCase()}while(rooms.has(s));return s}
io.on('connection',socket=>{
 socket.on('create',()=>{leave(socket);const c=code();rooms.set(c,{host:socket.id,guest:null,started:false});socket.join(c);socket.data.code=c;socket.emit('room',{code:c,role:'host'})});
 socket.on('join',raw=>{const c=String(raw||'').trim().toUpperCase();const r=rooms.get(c);if(!r||r.guest||r.started){socket.emit('errorMessage','Sala inexistente, cheia ou já iniciada.');return}leave(socket);r.guest=socket.id;socket.join(c);socket.data.code=c;socket.emit('room',{code:c,role:'guest'});io.to(c).emit('ready')});
 socket.on('start',()=>{const r=rooms.get(socket.data.code);if(!r||r.host!==socket.id||!r.guest)return;r.started=true;io.to(socket.data.code).emit('start')});
 socket.on('inputs',v=>{const r=rooms.get(socket.data.code);if(!r||!r.started||r.guest!==socket.id)return;const safe={};for(const k of ['KeyA','KeyD','ArrowLeft','ArrowRight','Space','KeyW','ArrowUp','KeyJ','KeyK','KeyL','KeyS','ShiftLeft','ShiftRight'])safe[k]=v?.keys?.[k]?1:0;io.to(r.host).emit('inputs',{keys:safe,revive:!!v?.revive})});
 socket.on('snapshot',v=>{const r=rooms.get(socket.data.code);if(!r||!r.started||r.host!==socket.id||!r.guest)return;io.to(r.guest).emit('snapshot',v)});
 socket.on('leave',()=>leave(socket));socket.on('disconnect',()=>leave(socket));
});
const port=process.env.PORT||3000;
server.listen(port,'0.0.0.0',()=>console.log('Cubo Mágico Coop: http://localhost:'+port));
