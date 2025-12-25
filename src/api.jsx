import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Replace with your Django server
const BASE_URL = "http://YOUR_DJANGO_IP:8000/api";

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
        const res = await axios.post(`${BASE_URL}/auth/refresh`, {
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
