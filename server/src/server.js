import http from "http";
import { Server } from "socket.io";

import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectDb } from "./config/db.js";
import { attachRealtime } from "./realtime/socket.js";

async function bootstrap() {
  await connectDb();

  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGINS,
      credentials: true
    }
  });

  attachRealtime(io);

  httpServer.listen(env.PORT, () => {
    console.log(`Lo'ra API running on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});