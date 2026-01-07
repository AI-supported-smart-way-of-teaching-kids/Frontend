import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Replace with your Django server
// For development: use your local IP (e.g., "http://192.168.1.100:8000/api")
// For production: use your production server URL
// You can also set this via environment variables
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: BASE_URL,
});

// Attach Access Token Automatically
api.interceptors.request.use(async (config) => {
  const access = await AsyncStorage.getItem("access");
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

// Refresh Token If Expired
api.interceptors.response.use(
  res => res,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refresh = await AsyncStorage.getItem("refresh");
      if (!refresh) {
        return Promise.reject(error);
      }

      try {
        // Use the profiles auth refresh endpoint
        const res = await axios.post(`${BASE_URL}/profiles/auth/refresh/`, {
          refresh: refresh,
        });

        const newAccess = res.data.access;
        await AsyncStorage.setItem("access", newAccess);

        api.defaults.headers.Authorization = `Bearer ${newAccess}`;
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;

        return api(originalRequest);
      } catch (err) {
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
