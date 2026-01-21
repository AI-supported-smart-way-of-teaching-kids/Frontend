import api, { fixMediaUrl } from "../api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_QUIZZES = "@app_quizzes_v1";
const STORAGE_ATTEMPTS = "@app_quiz_attempts_v1";

// ========== QUIZZES API ==========

/**
 * Convert snake_case to camelCase for quiz object
 */
const convertQuizToCamelCase = (quiz) => {
  const converted = { ...quiz };
  // Convert time_limit to timeLimit
  if (converted.time_limit !== undefined) {
    converted.timeLimit = converted.time_limit;
    delete converted.time_limit;
  }
  // Ensure video is set (can be null)
  if (converted.video === undefined) {
    converted.video = null;
  }

  // Handle media_url prefixing for questions if present
  if (converted.questions && Array.isArray(converted.questions)) {
    converted.questions = converted.questions.map(q => {
      const qNew = { ...q };
      if (qNew.media_url) {
        qNew.media_url = fixMediaUrl(qNew.media_url);
      }
      return qNew;
    });
  }

  return converted;
};

/**
 * Convert camelCase to snake_case for API payload
 */
const convertQuizToSnakeCase = (quiz) => {
  const payload = { ...quiz };
  if (payload.timeLimit !== undefined) {
    payload.time_limit = payload.timeLimit;
    delete payload.timeLimit;
  }
  // Keep id if present (useful for PUT)
  // Keep results if present (managed by backend usually, but no harm in sending)
  return payload;
};

/**
 * Get all quizzes from backend
 */
export const getQuizzes = async () => {
  try {
    const response = await api.get("quizzes/quizzes/");
    const quizzes = {};
    let quizArray = [];

    // Handle different response formats
    if (Array.isArray(response.data)) {
      quizArray = response.data;
    } else if (response.data.results) {
      // Handle paginated response
      quizArray = response.data.results;
    } else if (response.data) {
      quizArray = [response.data];
    }

    // Convert to object keyed by id and convert field names
    quizArray.forEach((quiz) => {
      quizzes[quiz.id] = convertQuizToCamelCase(quiz);
    });

    // Cache in AsyncStorage
    await AsyncStorage.setItem(STORAGE_QUIZZES, JSON.stringify(quizzes));
    return quizzes;
  } catch (error) {
    // Handle 403 Forbidden - might be permission issue or expired token
    if (error.response?.status === 403) {
      console.warn("Access forbidden to quizzes endpoint (403). This might be a permission issue or expired token.");
      // If token refresh was attempted and still 403, it's likely a permission issue
      if (error.config?._retry) {
        console.warn("Token refresh attempted but still getting 403. User may not have permission to access quizzes.");
      }
    } else {
      console.warn("Failed to fetch quizzes from backend:", error);
    }
    // Fallback to AsyncStorage
    const cached = await AsyncStorage.getItem(STORAGE_QUIZZES);
    return cached ? JSON.parse(cached) : {};
  }
};

/**
 * Get a single quiz by ID
 */
export const getQuiz = async (id) => {
  try {
    const response = await api.get(`quizzes/quizzes/${id}/`);
    return convertQuizToCamelCase(response.data);
  } catch (error) {
    console.warn(`Failed to fetch quiz ${id} from backend:`, error);
    // Fallback to AsyncStorage
    const cached = await AsyncStorage.getItem(STORAGE_QUIZZES);
    const quizzes = cached ? JSON.parse(cached) : {};
    return quizzes[id] || null;
  }
};

/**
 * Create a new quiz
 */
export const createQuiz = async (quizData) => {
  try {
    const payload = quizData instanceof FormData ? quizData : convertQuizToSnakeCase(quizData);
    const response = await api.post("quizzes/quizzes/", payload);
    const newQuiz = convertQuizToCamelCase(response.data);

    // Update local cache
    const cached = await AsyncStorage.getItem(STORAGE_QUIZZES);
    const quizzes = cached ? JSON.parse(cached) : {};
    quizzes[newQuiz.id] = newQuiz;
    await AsyncStorage.setItem(STORAGE_QUIZZES, JSON.stringify(quizzes));

    return newQuiz;
  } catch (error) {
    console.warn("Failed to create quiz on backend:", error);
    throw error;
  }
};

/**
 * Update a quiz
 */
export const updateQuiz = async (id, quizData) => {
  try {
    const payload = quizData instanceof FormData ? quizData : convertQuizToSnakeCase(quizData);
    const response = await api.put(`quizzes/quizzes/${id}/`, payload);
    const updatedQuiz = convertQuizToCamelCase(response.data);

    // Update local cache
    const cached = await AsyncStorage.getItem(STORAGE_QUIZZES);
    const quizzes = cached ? JSON.parse(cached) : {};
    quizzes[id] = updatedQuiz;
    await AsyncStorage.setItem(STORAGE_QUIZZES, JSON.stringify(quizzes));

    return updatedQuiz;
  } catch (error) {
    console.warn(`Failed to update quiz ${id} on backend:`, error);
    throw error;
  }
};

/**
 * Patch (partial update) a quiz
 */
export const patchQuiz = async (id, quizData) => {
  try {
    const payload = quizData instanceof FormData ? quizData : convertQuizToSnakeCase(quizData);
    const response = await api.patch(`quizzes/quizzes/${id}/`, payload);
    const updatedQuiz = convertQuizToCamelCase(response.data);

    // Update local cache
    const cached = await AsyncStorage.getItem(STORAGE_QUIZZES);
    const quizzes = cached ? JSON.parse(cached) : {};
    quizzes[id] = { ...quizzes[id], ...updatedQuiz };
    await AsyncStorage.setItem(STORAGE_QUIZZES, JSON.stringify(quizzes));

    return updatedQuiz;
  } catch (error) {
    console.warn(`Failed to patch quiz ${id} on backend:`, error);
    throw error;
  }
};

/**
 * Delete a quiz
 */
export const deleteQuiz = async (id) => {
  try {
    await api.delete(`quizzes/quizzes/${id}/`);

    // Update local cache
    const cached = await AsyncStorage.getItem(STORAGE_QUIZZES);
    const quizzes = cached ? JSON.parse(cached) : {};
    delete quizzes[id];
    await AsyncStorage.setItem(STORAGE_QUIZZES, JSON.stringify(quizzes));

    return true;
  } catch (error) {
    console.warn(`Failed to delete quiz ${id} on backend:`, error);
    throw error;
  }
};

// ========== QUIZ ATTEMPTS API ==========

/**
 * Get all quiz attempts
 */
export const getQuizAttempts = async (filters = {}) => {
  try {
    const response = await api.get("quizzes/attempts/", { params: filters });
    const attempts = Array.isArray(response.data)
      ? response.data
      : (response.data.results || []);

    // Cache in AsyncStorage
    await AsyncStorage.setItem(STORAGE_ATTEMPTS, JSON.stringify(attempts));
    return attempts;
  } catch (error) {
    console.warn("Failed to fetch quiz attempts from backend:", error);
    // Fallback to AsyncStorage
    const cached = await AsyncStorage.getItem(STORAGE_ATTEMPTS);
    return cached ? JSON.parse(cached) : [];
  }
};

/**
 * Get a single quiz attempt by ID
 */
export const getQuizAttempt = async (id) => {
  try {
    const response = await api.get(`quizzes/attempts/${id}/`);
    return response.data;
  } catch (error) {
    console.warn(`Failed to fetch quiz attempt ${id} from backend:`, error);
    // Fallback to AsyncStorage
    const cached = await AsyncStorage.getItem(STORAGE_ATTEMPTS);
    const attempts = cached ? JSON.parse(cached) : [];
    return attempts.find(a => a.id === id) || null;
  }
};

/**
 * Create a new quiz attempt
 */
export const createQuizAttempt = async (attemptData) => {
  try {
    const response = await api.post("quizzes/attempts/", attemptData);
    const newAttempt = response.data;

    // Update local cache
    const cached = await AsyncStorage.getItem(STORAGE_ATTEMPTS);
    const attempts = cached ? JSON.parse(cached) : [];
    attempts.push(newAttempt);
    await AsyncStorage.setItem(STORAGE_ATTEMPTS, JSON.stringify(attempts));

    return newAttempt;
  } catch (error) {
    console.warn("Failed to create quiz attempt on backend:", error);
    throw error;
  }
};

/**
 * Submit a quiz attempt (complete the quiz)
 * Tries multiple endpoints to support different backend configurations
 */
export const submitQuizAttempt = async (attemptData) => {
  try {
    const path = "quizzes/attempts/submit/";
    console.log(`Attempting quiz submission to: ${path}`);
    const response = await api.post(path, attemptData);
    console.log(`Success with: ${path}`);

    const submittedAttempt = response.data;
    // Update local cache
    const cached = await AsyncStorage.getItem(STORAGE_ATTEMPTS);
    const attempts = cached ? JSON.parse(cached) : [];
    attempts.push(submittedAttempt);
    await AsyncStorage.setItem(STORAGE_ATTEMPTS, JSON.stringify(attempts));

    return submittedAttempt;
  } catch (error) {
    console.error("Quiz submission failed:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Update a quiz attempt
 */
export const updateQuizAttempt = async (id, attemptData) => {
  try {
    const response = await api.put(`quizzes/attempts/${id}/`, attemptData);
    const updatedAttempt = response.data;

    // Update local cache
    const cached = await AsyncStorage.getItem(STORAGE_ATTEMPTS);
    const attempts = cached ? JSON.parse(cached) : [];
    const index = attempts.findIndex(a => a.id === id);
    if (index >= 0) {
      attempts[index] = updatedAttempt;
    }
    await AsyncStorage.setItem(STORAGE_ATTEMPTS, JSON.stringify(attempts));

    return updatedAttempt;
  } catch (error) {
    console.warn(`Failed to update quiz attempt ${id} on backend:`, error);
    throw error;
  }
};

/**
 * Patch (partial update) a quiz attempt
 */
export const patchQuizAttempt = async (id, attemptData) => {
  try {
    const response = await api.patch(`quizzes/attempts/${id}/`, attemptData);
    const updatedAttempt = response.data;

    // Update local cache
    const cached = await AsyncStorage.getItem(STORAGE_ATTEMPTS);
    const attempts = cached ? JSON.parse(cached) : [];
    const index = attempts.findIndex(a => a.id === id);
    if (index >= 0) {
      attempts[index] = { ...attempts[index], ...updatedAttempt };
    }
    await AsyncStorage.setItem(STORAGE_ATTEMPTS, JSON.stringify(attempts));

    return updatedAttempt;
  } catch (error) {
    console.warn(`Failed to patch quiz attempt ${id} on backend:`, error);
    throw error;
  }
};

/**
 * Delete a quiz attempt
 */
export const deleteQuizAttempt = async (id) => {
  try {
    await api.delete(`quizzes/attempts/${id}/`);

    // Update local cache
    const cached = await AsyncStorage.getItem(STORAGE_ATTEMPTS);
    const attempts = cached ? JSON.parse(cached) : [];
    const filtered = attempts.filter(a => a.id !== id);
    await AsyncStorage.setItem(STORAGE_ATTEMPTS, JSON.stringify(filtered));

    return true;
  } catch (error) {
    console.warn(`Failed to delete quiz attempt ${id} on backend:`, error);
    throw error;
  }
};

