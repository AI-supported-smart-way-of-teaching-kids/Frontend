import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const DJANGO_PC_IP = "192.168.43.111";
export const DJANGO_PORT = "8000";

// FIXED: Added 'default' to ensure it works in the browser/Expo Go
export const BASE_URL = Platform.select({
  ios: `http://${DJANGO_PC_IP}:${DJANGO_PORT}/api/`,
  android: `http://${DJANGO_PC_IP}:${DJANGO_PORT}/api/`,
  default: `http://${DJANGO_PC_IP}:${DJANGO_PORT}/api/`,
});

export const API_ROOT = `http://${DJANGO_PC_IP}:${DJANGO_PORT}`;

export const fixMediaUrl = (url) => {
  if (!url) return null;
  if (!url.startsWith('http')) {
    return `${API_ROOT}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  // Replace old IP if it exists in the absolute URL
  return url.replace(
    /^http:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?/,
    API_ROOT
  );
};

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach Access Token Automatically
api.interceptors.request.use(async (config) => {
  const access = await AsyncStorage.getItem("access");
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }

  // Robust FormData detection
  const isFormData = config.data && (
    config.data instanceof FormData ||
    (config.data.constructor && config.data.constructor.name === 'FormData') ||
    typeof config.data.append === 'function' ||
    config.data.constructor?.name === 'FormData'
  );

  console.log(`[API REQUEST] ${config.method.toUpperCase()} ${config.url}`, isFormData ? "(FormData)" : "(JSON)");

  if (isFormData) {
    console.log("API: FormData detected. URL:", config.url);
    // Explicitly remove content-type so browser/axios sets it with boundary
    if (config.headers && config.headers.delete) {
      config.headers.delete("Content-Type");
    } else if (config.headers) {
      delete config.headers["Content-Type"];
      config.headers["Content-Type"] = undefined; // Ensure it's gone
    }
  } else if (!config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }

  return config;
}, (error) => Promise.reject(error));

// Refresh Token If Expired
api.interceptors.response.use(
  res => res,
  async error => {
    const originalRequest = error.config;

    // If 401 Unauthorized or 403 Forbidden, try to refresh the token
    // 403 can sometimes mean expired token that needs refresh
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;

      const refresh = await AsyncStorage.getItem("refresh");
      if (!refresh) {
        // If no refresh token, clear auth and reject
        await AsyncStorage.multiRemove(["access", "refresh", "user"]);
        return Promise.reject(error);
      }

      try {
        // FIXED: Path changed to match your profiles/auth/refresh/ endpoint
        // Fix: Removed / before profiles to avoid double slash if BASE_URL ends with /
        const res = await axios.post(`${BASE_URL}profiles/auth/refresh/`, { refresh });
        const newAccess = res.data.access;

        await AsyncStorage.setItem("access", newAccess);

        // Update headers for future and current request
        api.defaults.headers.Authorization = `Bearer ${newAccess}`;
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;

        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, the user must log in again
        await AsyncStorage.multiRemove(["access", "refresh", "user"]);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;