import api from "../api";
import { Platform } from "react-native";

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
  const res = await api.get("lessons/collections/", { params });
  return res.data;
};

export const createCollection = async (payload) => {
  const res = await api.post("lessons/collections/", payload);
  return res.data;
};

export const getCollection = async (id) => {
  const res = await api.get(`lessons/collections/${id}/`);
  return res.data;
};

export const updateCollection = async (id, payload) => {
  const res = await api.patch(`lessons/collections/${id}/`, payload);
  return res.data;
};

export const patchCollection = async (id, payload) => {
  const res = await api.patch(`lessons/collections/${id}/`, payload);
  return res.data;
};

export const deleteCollection = async (id) => {
  const res = await api.delete(`lessons/collections/${id}/`);
  return res.data;
};

// ========== LESSONS (VIDEOS) ==========

export const getLessons = async (params = {}) => {
  const res = await api.get("lessons/lessons/", { params });
  return res.data;
};

export const createLesson = async (data) => {
  console.log("createLesson/JSON: Creating lesson metadata...", data);
  try {
    const res = await api.post("lessons/lessons/", data);
    return res.data;
  } catch (error) {
    console.error("createLesson Error:", error.response?.data || error.message);
    throw error;
  }
};



export const getLesson = async (id) => {
  const res = await api.get(`lessons/lessons/${id}/`);
  return res.data;
};

export const updateLesson = async (id, payload, config = {}) => {
  const res = await api.patch(`lessons/lessons/${id}/`, payload, config);
  return res.data;
};

export const patchLesson = async (id, payload, config = {}) => {
  const res = await api.patch(`lessons/lessons/${id}/`, payload, config);
  return res.data;
};

export const deleteLesson = async (id) => {
  const res = await api.delete(`lessons/lessons/${id}/`);
  return res.data;
};

/**
 * Track progress for a specific lesson.
 * POST /api/lessons/lessons/{id}/track-progress/
 */
export const trackLessonProgress = async (id, payload = {}) => {
  // Convert payload to FormData to avoid 415 Unsupported Media Type
  const formData = new FormData();
  console.log(`trackLessonProgress: Converting payload to FormData for ID: ${id}`);

  Object.keys(payload).forEach(key => {
    if (payload[key] !== null && payload[key] !== undefined) {
      const val = String(payload[key]);
      formData.append(key, val);
      console.log(`  -> ${key}: ${val}`);
    }
  });

  const res = await api.post(`lessons/lessons/${id}/track-progress/`, formData);
  return res.data;
};

// ========== MEDIA UPLOADS ==========

export const getMediaUploads = async (params = {}) => {
  const res = await api.get("lessons/media-uploads/", { params });
  return res.data;
};

/**
 * Maps common MIME types to those supported by the backend.
 * Required for robust uploads across different platforms/browsers.
 */
const mapFileTypeToBackend = (fileType) => {
  if (!fileType || typeof fileType !== 'string') return 'application/octet-stream';

  // Trim and remove any spaces (fixes bugs from front-end helpers)
  const normalizedType = fileType.toLowerCase().trim().replace(/\s+/g, '');

  const typeMap = {
    'video/quicktime': 'video/mp4', // .mov files
    'video/x-msvideo': 'video/mp4', // .avi files
    'image/jpg': 'image/jpeg',      // Standardize to image/jpeg
  };
  return typeMap[normalizedType] || normalizedType;
};

export const createMediaUpload = async ({ lesson, file, file_type, token }) => {
  // lesson: number or string ID
  // file: for web -> File/Blob; for RN -> { uri, name, type }
  // file_type: string like 'video/mp4' or 'image/jpeg'
  // token: auth token string (optional, pulled from AsyncStorage by api.jsx if not provided)

  const form = new FormData();

  // --- IMPORTANT: stringify everything that's not a file ---
  form.append('lesson', String(lesson));
  form.append('file_type', String(file_type));
  form.append('status', 'pending');

  // Append the file depending on platform/value
  if (Platform.OS === 'web') {
    // On web we'd expect a plain File or Blob instance
    // Some pickers give { file } or { uri } — handle both
    if (file instanceof File || file instanceof Blob) {
      form.append('file', file, file.name || `upload_${Date.now()}`);
    } else if (file && file.file instanceof File) {
      form.append('file', file.file, file.file.name || `upload_${Date.now()}`);
    } else if (file && file.uri) {
      // If we have a URI on web, fetch it to convert to Blob
      try {
        console.log("createMediaUpload: Fetching blob from URI on web:", file.uri);
        const fetchRes = await fetch(file.uri);
        const blob = await fetchRes.blob();
        form.append('file', blob, file.name || `upload_${Date.now()}`);
      } catch (e) {
        console.error("createMediaUpload: Failed to fetch blob from URI", e);
        throw new Error('Unsupported web file type for upload');
      }
    } else {
      throw new Error('Unsupported web file type for upload');
    }
  } else {
    // React Native / Expo
    // file should be an object { uri, name, type }
    form.append('file', {
      uri: file.uri,
      name: file.name || `upload_${Date.now()}.${(file.type || '').split('/').pop() || 'mp4'}`,
      type: file.type || file.mimeType || 'video/mp4',
    });
  }

  // Debug FormData contents
  if (Platform.OS !== 'web') {
    // RN FormData internals: debug _parts
    if (form._parts) {
      console.log('FormData parts:');
      form._parts.forEach(p => console.log(p[0], p[1]));
    }
  } else {
    // Browser FormData debug:
    try {
      for (const pair of form.entries()) {
        console.log(pair[0], typeof pair[1] === 'object' ? pair[1].constructor.name : pair[1]);
      }
    } catch (e) {
      console.log('FormData iterator not available');
    }
  }

  try {
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    // DO NOT set Content-Type header — let axios/browser set the boundary
    // api.jsx interceptor will handle removing Content-Type for FormData

    console.log("createMediaUpload: Executing POST /api/lessons/media-uploads/");

    const res = await api.post("lessons/media-uploads/", form, {
      headers,
      // Optional: track upload progress
      onUploadProgress: (progressEvent) => {
        if (progressEvent.lengthComputable) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log('Upload progress:', percent + '%');
        }
      },
    });

    return res.data;
  } catch (err) {
    // Normalize error so caller sees server response text if available
    const serverData = err.response?.data;
    console.error('createMediaUpload error:', err.message, serverData);
    throw err;
  }
};

export const getMediaUpload = async (id) => {
  const res = await api.get(`lessons/media-uploads/${id}/`);
  return res.data;
};

export const updateMediaUpload = async (id, payload) => {
  const res = await api.put(`lessons/media-uploads/${id}/`, payload);
  return res.data;
};

export const patchMediaUpload = async (id, payload) => {
  const res = await api.patch(`lessons/media-uploads/${id}/`, payload);
  return res.data;
};

export const deleteMediaUpload = async (id) => {
  const res = await api.delete(`lessons/media-uploads/${id}/`);
  return res.data;
};


