import api from "../api";

/**
 * Core service helpers.
 *
 * Endpoints:
 * - /api/core/audit-logs/
 * - /api/core/audit-logs/{id}/
 * - /api/core/health/
 */

// ========== AUDIT LOGS ==========

export const getAuditLogs = async (params = {}) => {
  const res = await api.get("/core/audit-logs/", { params });
  return res.data;
};

export const getAuditLog = async (id) => {
  const res = await api.get(`/core/audit-logs/${id}/`);
  return res.data;
};

// ========== HEALTH ==========

export const getHealth = async () => {
  const res = await api.get("/core/health/");
  return res.data;
};






