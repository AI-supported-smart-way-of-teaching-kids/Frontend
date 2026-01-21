import api from "../api";

/**
 * Fetch AI recommendations for the kids dashboard.
 * Optionally scoped to a specific child.
 * Uses /api/ai/ml/recommendations/ endpoint (baseURL already includes /api).
 */
export const getRecommendations = async ({ childId } = {}) => {
  if (!childId) {
    throw new Error("Child ID is required for recommendations");
  }

  // Use /ai/ml/recommendations/ endpoint (baseURL already includes /api)
  const response = await api.get(`ai/ml/recommendations/`, { params: { child_id: childId } });

  // Normalise response to an array
  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (response.data?.results && Array.isArray(response.data.results)) {
    return response.data.results;
  }

  return response.data ? [response.data] : [];
};

/**
 * Fetch a single AI recommendation by ID.
 */
export const getRecommendation = async (id) => {
  if (!id) throw new Error("Recommendation ID is required");
  const response = await api.get(`ai/recommendations/${id}/`);
  return response.data;
};

/**
 * Fetch real-time status of ML recommendations for a child.
 * @param {number|string} childId - The ID of the child.
 */
export const getMLRealtimeStatus = async (childId) => {
  const response = await api.get('ai/ml/recommendations/realtime-status/', {
    params: { child_id: childId },
  });
  return response.data;
};


