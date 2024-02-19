const http = require('http')
const path = require('path')
const fs = require('fs')

const dbPath = path.join(__dirname, 'db.json');
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({
    devices: [],
    eventsHistory: [],
    messages: [],
  }))
}

const presetToken = 'B53498D3-1752-4AA7-BACA-7013309B7468';

const eventHandlers = {
  log(data) {
    console.log(data);
    return { code: 0, message: 'handle by log' }
  },
  'message.publish': (data, db) => {
    const msg = {
      topic: data.topic,
      payload: data.payload,
      qos: data.qos,
      clientId: data.clientid,
      createdAt: new Date().toISOString(),
    }
    db.messages.push(msg)
    return msg;
  },
  eventsHistory: (data, db) => {
    db.eventsHistory.push({
      event: data.event,
      clientId: data.clientid,
      username: data.username,
      peername: data.peername,
      options: {
        proto_ver: data.proto_ver,
        keepalive: data.keepalive,
        clean_start: data.clean_start,
        reason: data.reason,
        topic: data.topic,
        qos: data.qos,
        node: data.node,
      },
      createdAt: new Date().toISOString(),
    })
  },
  connectedAndDisconnected: (data, db) => {
    const connected = data.event === 'client.connected'
    eventHandlers.eventsHistory(data, db)
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
    return device;
  }
}

const server = http.createServer((req, res) => {
  let db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
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
        } else if (['session.subscribed', 'session.unsubscribed'].includes(eventname)) {
          eventname = 'eventsHistory'
        }
        const eventHandler = eventHandlers[eventname] || eventHandlers.log
        console.log(req.method, req.url)
        if (eventHandler) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          const result = eventHandlers[eventname](data, db);
          fs.writeFileSync(dbPath, JSON.stringify(db, null, 2))
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
    res.end(JSON.stringify({
      deviceCount: db.devices.length,
      messageCount: db.messages.length,
      eventsHistoryCount: db.eventsHistory.length,
      ...db,
    }, null, 2));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('API Not Found');
  }
});

const port = 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
