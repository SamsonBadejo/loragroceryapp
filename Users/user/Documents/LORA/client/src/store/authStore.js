import { create } from "zustand";

const STORAGE_KEY = "lora-auth";

function loadSavedAuth() {
  if (typeof localStorage === "undefined") {
    return {
      user: null,
      accessToken: null,
      refreshToken: null
    };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return {
        user: null,
        accessToken: null,
        refreshToken: null
      };
    }

    const parsed = JSON.parse(saved);

    return {
      user: parsed.user || null,
      accessToken: parsed.accessToken || null,
      refreshToken: parsed.refreshToken || null
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);

    return {
      user: null,
      accessToken: null,
      refreshToken: null
    };
  }
}

function saveAuth(user, accessToken, refreshToken) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      user,
      accessToken,
      refreshToken
    })
  );
}

const savedAuth = loadSavedAuth();

export const useAuthStore = create((set, get) => ({
  user: savedAuth.user,
  accessToken: savedAuth.accessToken,
  refreshToken: savedAuth.refreshToken,

  isAuthenticated: Boolean(savedAuth.accessToken && savedAuth.user),

  setSession: (user, accessToken, refreshToken) => {
    saveAuth(user, accessToken, refreshToken);

    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true
    });
  },

  updateUser: (nextUser) => {
    const current = get();

    const user =
      typeof nextUser === "function" ? nextUser(current.user) : nextUser;

    saveAuth(user, current.accessToken, current.refreshToken);

    set({
      user,
      isAuthenticated: Boolean(current.accessToken && user)
    });
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false
    });
  }
}));