import api from "../api";
import AsyncStorage from "@react-native-async-storage/async-storage";

// =====================
// AUTH
// =====================

export const login = async (credentials) => {
  // POST /api/profiles/auth/login/
  const response = await api.post("profiles/auth/login/", credentials);
  const data = response.data || {};

  if (data.access) await AsyncStorage.setItem("access", data.access);
  if (data.refresh) await AsyncStorage.setItem("refresh", data.refresh);
  if (data.user) await AsyncStorage.setItem("user", JSON.stringify(data.user));

  return data;
};

export const register = async (payload) => {
  // POST /api/profiles/users/
  const response = await api.post("/profiles/users/", payload);
  return response.data;
};

export const refreshToken = async (refresh) => {
  // POST /api/profiles/auth/refresh/
  const response = await api.post("profiles/auth/refresh/", { refresh });
  return response.data;
};

// =====================
// CHILDREN (UUID-based)
// =====================

export const getChildren = async (params = {}) => {
  // GET /api/profiles/children/
  const response = await api.get("profiles/children/", { params });
  return response.data;
};

export const createChild = async (payload) => {
  // POST /api/profiles/children/
  console.log("createChild payload:", payload);

  try {
    const response = await api.post("profiles/children/", payload);
    const child = response.data;

    // ✅ Store active child UUID automatically
    if (child?.uuid) {
      await AsyncStorage.setItem("activeChildUUID", child.uuid);
    }

    return child;
  } catch (error) {
    console.error("createChild error:", error.response?.data || error.message);
    throw error;
  }
};

export const getChild = async (uuid) => {
  // GET /api/profiles/children/{uuid}/
  try {
    const response = await api.get(`profiles/children/${uuid}/`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw error;
  }
};

export const updateChild = async (uuid, payload) => {
  // PUT /api/profiles/children/{uuid}/
  const response = await api.put(`profiles/children/${uuid}/`, payload);
  return response.data;
};

export const patchChild = async (uuid, payload) => {
  // PATCH /api/profiles/children/{uuid}/
  const response = await api.patch(`profiles/children/${uuid}/`, payload);
  return response.data;
};

export const deleteChild = async (uuid) => {
  // DELETE /api/profiles/children/{uuid}/
  const response = await api.get(`profiles/children/${uuid}/progress/`);
  return response.data;
};

export const getChildProgress = async (uuid) => {
  // GET /api/profiles/children/{uuid}/progress/
  const response = await api.get(`profiles/children/${uuid}/progress/`);
  return response.data;
};

// =====================
// ACTIVE CHILD HELPERS
// =====================

export const getActiveChildUUID = async () => {
  return await AsyncStorage.getItem("activeChildUUID");
};

export const clearActiveChildUUID = async () => {
  await AsyncStorage.removeItem("activeChildUUID");
};

// =====================
// TEACHERS
// =====================

export const getTeachers = async (params = {}) => {
  // GET /api/profiles/teachers/
  const response = await api.get("profiles/teachers/", { params });
  return response.data;
};

export const getTeacher = async (teacherId) => {
  // GET /api/profiles/teachers/me/
  try {
    const response = await api.get(`profiles/teachers/me/`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw error;
  }
};

export const createTeacher = async (payload) => {
  // POST /api/profiles/teachers/
  try {
    const response = await api.post("profiles/teachers/", payload);
    return response.data;
  } catch (error) {
    console.error("createTeacher error:", error.response?.data || error.message);
    throw error;
  }
};

export const updateTeacher = async (payload) => {
  // PUT /api/profiles/teachers/me/
  try {
    const response = await api.put("profiles/teachers/me/", payload);
    return response.data;
  } catch (error) {
    console.error("updateTeacher error:", error.response?.data || error.message);
    throw error;
  }
};

export const patchTeacher = async (payload) => {
  // PATCH /api/profiles/teachers/me/
  try {
    const response = await api.patch("profiles/teachers/me/", payload);
    return response.data;
  } catch (error) {
    console.error("patchTeacher error:", error.response?.data || error.message);
    throw error;
  }
};

// =====================
// USERS
// =====================

export const getUsers = async (params = {}) => {
  // GET /api/profiles/users/
  const response = await api.get("profiles/users/", { params });
  return response.data;
};

export const createUser = async (payload) => {
  // POST /api/profiles/users/
  const response = await api.post("/profiles/users/", payload);
  return response.data;
};

export const getUser = async (id) => {
  // GET /api/profiles/users/{id}/
  try {
    const response = await api.get(`profiles/users/${id}/`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw error;
  }
};

export const updateUser = async (id, payload) => {
  // PUT /api/profiles/users/{id}/
  const response = await api.put(`profiles/users/${id}/`, payload);
  return response.data;
};

export const patchUser = async (id, payload) => {
  // PATCH /api/profiles/users/{id}/
  const response = await api.patch(`profiles/users/${id}/`, payload);
  return response.data;
};

export const deleteUser = async (id) => {
  // DELETE /api/profiles/users/{id}/
  const response = await api.delete(`profiles/users/${id}/`);
  return response.data;
};

export const getUserProfile = async () => {
  // GET /api/profiles/users/profile/
  const response = await api.get("profiles/users/profile/");
  return response.data;
};

export const updateUserProfile = async (payload) => {
  // PUT /api/profiles/users/profile/
  const response = await api.put("profiles/users/profile/", payload);
  return response.data;
};
