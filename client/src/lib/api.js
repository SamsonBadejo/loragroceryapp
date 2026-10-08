import axios from "axios";
import { useAuthStore } from "../store/authStore";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000
});

let refreshPromise = null;

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (!original || original._retry) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const refreshToken = useAuthStore.getState().refreshToken;

    if (status !== 401 || !refreshToken) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = axios.post(`${API_URL}/auth/refresh`, {
          refreshToken
        });
      }

      const { data } = await refreshPromise;

      useAuthStore
        .getState()
        .setSession(data.user, data.accessToken, data.refreshToken);

      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${data.accessToken}`;

      return api(original);
    } catch (refreshError) {
      useAuthStore.getState().logout();
      return Promise.reject(refreshError);
    } finally {
      refreshPromise = null;
    }
  }
);

function currency(value) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function getErrorMessage(error, fallback = "Something went wrong") {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

export { API_URL, api, currency, getErrorMessage };