let ioInstance = null;

export function attachRealtime(io) {
  ioInstance = io;

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("order:join", (orderId) => {
      if (orderId) {
        socket.join(`order:${orderId}`);
      }
    });

    socket.on("admin:join-live", () => {
      socket.join("admin:live");
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
}

export function getIo() {
  return ioInstance;
}

export function emitOrderUpdate(orderOrId, maybePayload) {
  const io = getIo();

  if (!io) return;

  const order =
    typeof orderOrId === "string" ? maybePayload : orderOrId;

  const orderId =
    typeof orderOrId === "string"
      ? orderOrId
      : orderOrId?._id?.toString?.() || orderOrId?._id;

  if (!orderId || !order) return;

  io.to(`order:${orderId}`).emit("order:update", order);
  io.to("admin:live").emit("admin:order-update", order);
}

export function emitRiderLocation(orderOrRiderId, payload = {}) {
  const io = getIo();

  if (!io) return;

  const orderId = payload.orderId || orderOrRiderId;

  if (!orderId) return;

  const finalPayload = {
    orderId,
    ...payload
  };

  io.to(`order:${orderId}`).emit("rider:location", finalPayload);
  io.to("admin:live").emit("admin:rider-location", finalPayload);
}