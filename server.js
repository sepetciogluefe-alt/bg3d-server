// ============================================================
// Battle Gang 3D - Cevrimici Oda Sunucusu (Node.js + ws)
// Kurulum:  npm init -y && npm i ws
// Calistir: node server.js     -> ws://0.0.0.0:8080
// Ucretsiz internet sunucusu icin: Render.com / Fly.io'ya bu
// dosyayi yukle (Start: "node server.js"). HTTPS adresini
// oyundaki SERVER_URL satirina wss:// olarak yaz.
// Ayni Wi-Fi testi: node server.js calistir, telefonundan
// ws://BILGISAYAR-IP:8080 adresini SERVER_URL'e yaz.
// ============================================================
const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });
const rooms = new Map(); // kod -> {host, guest}

function makeCode() {
  let c = Math.random().toString(36).slice(2, 6).toUpperCase();
  while (rooms.has(c)) c = Math.random().toString(36).slice(2, 6).toUpperCase();
  return c;
}

wss.on('connection', ws => {
  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.t === 'host') {
      const code = makeCode();
      rooms.set(code, { host: ws, guest: null });
      ws.room = code; ws.role = 'host';
      ws.send(JSON.stringify({ t: 'hosted', code }));
      console.log('Oda kuruldu:', code);
    } else if (m.t === 'join') {
      const code = (m.code || '').toUpperCase();
      const room = rooms.get(code);
      if (!room || room.guest) {
        ws.send(JSON.stringify({ t: 'err', msg: !room ? 'Oda bulunamadı — kodu kontrol et.' : 'Oda dolu.' }));
        return;
      }
      room.guest = ws; ws.room = code; ws.role = 'guest';
      ws.send(JSON.stringify({ t: 'joined' }));
      room.host.send(JSON.stringify({ t: 'peer' }));
      console.log('Katilim:', code);
    } else if (m.t === 'to') {
      const room = ws.room && rooms.get(ws.room);
      if (!room) return;
      const peer = ws.role === 'host' ? room.guest : room.host;
      if (peer && peer.readyState === 1) peer.send(JSON.stringify({ t: 'to', data: m.data }));
    }
  });
  ws.on('close', () => {
    const room = ws.room && rooms.get(ws.room);
    if (!room) return;
    const peer = ws.role === 'host' ? room.guest : room.host;
    if (peer && peer.readyState === 1) peer.send(JSON.stringify({ t: 'bye' }));
    rooms.delete(ws.room);
    console.log('Oda kapandi:', ws.room);
  });
});

console.log('Sunucu hazir: ws://0.0.0.0:' + PORT);
