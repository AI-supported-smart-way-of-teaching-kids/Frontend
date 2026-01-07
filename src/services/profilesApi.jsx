import api from "../api";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ========== AUTH ==========

/**
 * Login and receive JWT tokens + user info.
 * Expects backend at POST /api/profiles/auth/login/
 */
export const login = async (credentials) => {
  const response = await api.post("/profiles/auth/login/", credentials);
  const data = response.data || {};

  // Common shape: { access, refresh, user }
  if (data.access) {
    await AsyncStorage.setItem("access", data.access);
  }
  if (data.refresh) {
    await AsyncStorage.setItem("refresh", data.refresh);
  }
  if (data.user) {
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
  }

  return data;
};

/**
 * Refresh access token using refresh token.
 * POST /api/profiles/auth/refresh/
 */
export const refreshToken = async (refresh) => {
  const response = await api.post("/profiles/auth/refresh/", { refresh });
  const data = response.data || {};
  if (data.access) {
    await AsyncStorage.setItem("access", data.access);
  }
  return data;
};

/**
 * Register a new user (parent/teacher).
 * POST /api/profiles/auth/register/
 */
export const register = async (payload) => {
  const response = await api.post("/profiles/auth/register/", payload);
  return response.data;
};

// ========== CHILDREN ==========

export const getChildren = async (params = {}) => {
  const response = await api.get("/profiles/children/", { params });
  return response.data;
};

export const createChild = async (payload) => {
  const response = await api.post("/profiles/children/", payload);
  return response.data;
};

export const getChild = async (id) => {
  const response = await api.get(`/profiles/children/${id}/`);
  return response.data;
};

export const updateChild = async (id, payload) => {
  const response = await api.put(`/profiles/children/${id}/`, payload);
  return response.data;
};

export const patchChild = async (id, payload) => {
  const response = await api.patch(`/profiles/children/${id}/`, payload);
  return response.data;
};

export const deleteChild = async (id) => {
  const response = await api.delete(`/profiles/children/${id}/`);
  return response.data;
};

export const getChildProgress = async (id) => {
  const response = await api.get(`/profiles/children/${id}/progress/`);
  return response.data;
};

// ========== TEACHERS ==========

export const getTeachers = async (params = {}) => {
  const response = await api.get("/profiles/teachers/", { params });
  return response.data;
};

export const getTeacher = async (id) => {
  const response = await api.get(`/profiles/teachers/${id}/`);
  return response.data;
};

// ========== USERS ==========

export const getUsers = async (params = {}) => {
  const response = await api.get("/profiles/users/", { params });
  return response.data;
};

export const createUser = async (payload) => {
  const response = await api.post("/profiles/users/", payload);
  return response.data;
};

export const getUser = async (id) => {
  const response = await api.get(`/profiles/users/${id}/`);
  return response.data;
};

export const updateUser = async (id, payload) => {
  const response = await api.put(`/profiles/users/${id}/`, payload);
  return response.data;
};

export const patchUser = async (id, payload) => {
  const response = await api.patch(`/profiles/users/${id}/`, payload);
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/profiles/users/${id}/`);
  return response.data;
};

/**
 * Convenience: GET /api/profiles/users/profile/
 * Returns the current authenticated user's profile.
 */
export const getCurrentUserProfile = async () => {
  const response = await api.get("/profiles/users/profile/");
  return response.data;
};

/**
 * Convenience: PUT /api/profiles/users/profile/
 */
export const updateCurrentUserProfile = async (payload) => {
  const response = await api.put("/profiles/users/profile/", payload);
  return response.data;
};


