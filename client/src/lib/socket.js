import { io } from "socket.io-client";
import { useAuthStore } from "../store/authStore";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: {
        token: useAuthStore.getState().accessToken
      }
    });
  }

  socket.auth = {
    token: useAuthStore.getState().accessToken
  };

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}