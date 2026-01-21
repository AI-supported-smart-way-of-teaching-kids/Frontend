import api from "../api";

/**
 * Progress & badges API helpers.
 * Endpoints:
 * - /api/progress/badges/
 * - /api/progress/badges/{id}/
 * - /api/progress/child-badges/
 * - /api/progress/child-badges/{id}/
 * - /api/progress/progress/
 * - /api/progress/progress/{id}/
 */

// ========== BADGES ==========

export const getBadges = async (params = {}) => {
  const res = await api.get("progress/badges/", { params });
  return res.data;
};

export const getBadge = async (id) => {
  const res = await api.get(`progress/badges/${id}/`);
  return res.data;
};

// ========== CHILD BADGES ==========

export const getChildBadges = async (params = {}) => {
  const res = await api.get("progress/child-badges/", { params });
  return res.data;
};

export const getChildBadge = async (id) => {
  const res = await api.get(`progress/child-badges/${id}/`);
  return res.data;
};

// ========== PROGRESS ==========

export const getProgress = async (params = {}) => {
  const res = await api.get("progress/progress/", { params });
  return res.data;
};

export const getProgressItem = async (id) => {
  const res = await api.get(`progress/progress/${id}/`);
  return res.data;
};


