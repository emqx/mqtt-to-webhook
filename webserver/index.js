const http = require('http')
const path = require('path')
const fs = require('fs')

const dbPath = path.join(__dirname, 'db.json');
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({
    devices: [],
    messages: [],
  }))
}
const presetToken = 'B53498D3-1752-4AA7-BACA-7013309B7468';

const eventHandlers = {
  log(data) {
    console.log(data);
    return { code: 0, message: 'handle by log' }
  },
  'message.publish': (data) => {
    const msg = {
      topic: data.topic,
      payload: data.payload,
      qos: data.qos,
      clientId: data.clientid,
      createdAt: new Date().toISOString(),
    }
    const db = require(dbPath)
    db.messages.push(msg)
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2))
    return msg;
  },
  connectedAndDisconnected: (data) => {
    const connected = data.event === 'client.connected'
    const db = require(dbPath)
    let device = db.devices.find($ => $.clientId === data.clientid)
    if (!device) {
      device = {
        clientId: data.clientid,
        username: data.username,
        connected,
        reason: data.reason,
        ip: data.peername,
        connectedAt: new Date().toISOString(),
      }
      db.devices.push(device)
    } else {
      Object.assign(device, {
        username: data.username,
        connected,
        reason: data.reason,
        ip: data.peername,
        connectedAt: new Date().toISOString(),
      })
    }
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2))
    return device;
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    // Auth
    const authorizationHeader = req.headers['authorization'];
    const token = authorizationHeader ? authorizationHeader.split(' ')[1] : null;

    if (token !== presetToken) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Unauthorized',
      }));
      return;
    }

    // POST /events/{eventname}
    let eventname = req.url.substring(8);

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (['client.disconnected', 'client.connected'].includes(eventname)) {
          eventname = 'connectedAndDisconnected'
        }
        const eventHandler = eventHandlers[eventname] || eventHandlers.log
        console.log(req.method, req.url)
        if (eventHandler) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          const result = eventHandlers[eventname](data);
          res.end(JSON.stringify(result));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'API Not Found',
            eventname,
          }));
        }
      } catch (error) {
        console.log(error)
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'JSON Parse Error',
        }));
      }
    });
  } else if (req.method === 'GET') {
    // GET /messages
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const db = require(dbPath)

    res.end(JSON.stringify({
      devocesCount: db.devices.length,
      messagesCount: db.messages.length,
      devices: db.devices,
      messages: db.messages,
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('API Not Found');
  }
});

const port = 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
