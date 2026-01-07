import api from "../api";

/**
 * Lessons / video content API helpers.
 *
 * Endpoints:
 * - /api/lessons/collections/
 * - /api/lessons/collections/{id}/
 * - /api/lessons/lessons/
 * - /api/lessons/lessons/{id}/
 * - /api/lessons/lessons/{id}/track-progress/
 * - /api/lessons/media-uploads/
 * - /api/lessons/media-uploads/{id}/
 */

// ========== COLLECTIONS ==========

export const getCollections = async (params = {}) => {
  const res = await api.get("/lessons/collections/", { params });
  return res.data;
};

export const createCollection = async (payload) => {
  const res = await api.post("/lessons/collections/", payload);
  return res.data;
};

export const getCollection = async (id) => {
  const res = await api.get(`/lessons/collections/${id}/`);
  return res.data;
};

export const updateCollection = async (id, payload) => {
  const res = await api.put(`/lessons/collections/${id}/`, payload);
  return res.data;
};

export const patchCollection = async (id, payload) => {
  const res = await api.patch(`/lessons/collections/${id}/`, payload);
  return res.data;
};

export const deleteCollection = async (id) => {
  const res = await api.delete(`/lessons/collections/${id}/`);
  return res.data;
};

// ========== LESSONS (VIDEOS) ==========

export const getLessons = async (params = {}) => {
  const res = await api.get("/lessons/lessons/", { params });
  return res.data;
};

export const createLesson = async (payload) => {
  const res = await api.post("/lessons/lessons/", payload);
  return res.data;
};

export const getLesson = async (id) => {
  const res = await api.get(`/lessons/lessons/${id}/`);
  return res.data;
};

export const updateLesson = async (id, payload) => {
  const res = await api.put(`/lessons/lessons/${id}/`, payload);
  return res.data;
};

export const patchLesson = async (id, payload) => {
  const res = await api.patch(`/lessons/lessons/${id}/`, payload);
  return res.data;
};

export const deleteLesson = async (id) => {
  const res = await api.delete(`/lessons/lessons/${id}/`);
  return res.data;
};

/**
 * Track progress for a specific lesson.
 * POST /api/lessons/lessons/{id}/track-progress/
 */
export const trackLessonProgress = async (id, payload = {}) => {
  const res = await api.post(`/lessons/lessons/${id}/track-progress/`, payload);
  return res.data;
};

// ========== MEDIA UPLOADS ==========

export const getMediaUploads = async (params = {}) => {
  const res = await api.get("/lessons/media-uploads/", { params });
  return res.data;
};

export const createMediaUpload = async (payload) => {
  const res = await api.post("/lessons/media-uploads/", payload);
  return res.data;
};

export const getMediaUpload = async (id) => {
  const res = await api.get(`/lessons/media-uploads/${id}/`);
  return res.data;
};

export const updateMediaUpload = async (id, payload) => {
  const res = await api.put(`/lessons/media-uploads/${id}/`, payload);
  return res.data;
};

export const patchMediaUpload = async (id, payload) => {
  const res = await api.patch(`/lessons/media-uploads/${id}/`, payload);
  return res.data;
};

export const deleteMediaUpload = async (id) => {
  const res = await api.delete(`/lessons/media-uploads/${id}/`);
  return res.data;
};


