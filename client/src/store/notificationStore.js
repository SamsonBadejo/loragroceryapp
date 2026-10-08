import { create } from "zustand";
import { api } from "../lib/api";

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  open: false,

  setOpen: (open) => {
    set({ open });
  },

  sync: async () => {
    try {
      const { data } = await api.get("/notifications");

      set({
        notifications: data.notifications || [],
        unreadCount: data.unreadCount || 0
      });
    } catch {
      set({
        notifications: [],
        unreadCount: 0
      });
    }
  },

  markRead: async (id) => {
    await api.patch(`/notifications/${id}/read`);

    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification._id === id
          ? {
              ...notification,
              read: true
            }
          : notification
      ),
      unreadCount: Math.max(0, state.unreadCount - 1)
    }));
  },

  markAllRead: async () => {
    await api.patch("/notifications/read-all");

    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        read: true
      })),
      unreadCount: 0
    }));
  }
}));