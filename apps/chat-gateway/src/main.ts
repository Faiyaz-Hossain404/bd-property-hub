import 'dotenv/config';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { Redis } from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';

const PORT = Number(process.env.CHAT_GATEWAY_PORT ?? 4100);
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .filter(Boolean);

function bootstrap() {
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: { origin: CORS_ORIGINS, credentials: true },
  });

  // The Redis adapter fans events across gateway instances so chat scales on
  // connection count independently of the REST API.
  const pubClient = new Redis(REDIS_URL);
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  // Socket authn/authz and the intermediated room model (buyer↔staff,
  // seller↔staff — never buyer↔seller) arrive in Phase 3 per
  // REALTIME_CHAT_ARCHITECTURE.md. This stub just proves the transport boots.
  io.on('connection', (socket) => {
    socket.emit('connected', { id: socket.id });
  });

  httpServer.listen(PORT, () => {
    console.log(`[chat-gateway] listening on :${PORT}`);
  });
}

bootstrap();
