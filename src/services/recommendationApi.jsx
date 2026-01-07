import api from "../api";

/**
 * Fetch AI recommendations for the kids dashboard.
 * Optionally scoped to a specific child.
 */
export const getRecommendations = async ({ childId } = {}) => {
  const params = {};

  // Many backends expect either `child` or `child_id` – support both defensively.
  if (childId) {
    params.child = childId;
    params.child_id = childId;
  }

  const response = await api.get("/ai/recommendations/", { params });

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
  const response = await api.get(`/ai/recommendations/${id}/`);
  return response.data;
};


