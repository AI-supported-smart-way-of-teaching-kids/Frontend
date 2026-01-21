import * as profilesApi from '../src/services/profilesApi';
import api from '../src/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock the api module
jest.mock('../src/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('profilesApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully and store tokens', async () => {
      const mockResponse = {
        data: {
          access: 'access-token',
          refresh: 'refresh-token',
          user: { id: 1, email: 'test@example.com', role: 'parent' },
        },
      };

      api.post.mockResolvedValue(mockResponse);

      const credentials = { email: 'test@example.com', password: 'password123' };
      const result = await profilesApi.login(credentials);

      expect(api.post).toHaveBeenCalledWith('/profiles/auth/login/', credentials);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('access', 'access-token');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('refresh', 'refresh-token');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(mockResponse.data.user)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle login without tokens', async () => {
      const mockResponse = {
        data: {
          user: { id: 1, email: 'test@example.com', role: 'parent' },
        },
      };

      api.post.mockResolvedValue(mockResponse);

      const result = await profilesApi.login({ email: 'test@example.com', password: 'password' });

      expect(api.post).toHaveBeenCalled();
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const mockResponse = {
        data: {
          id: 1,
          email: 'newuser@example.com',
          name: 'New User',
          role: 'parent',
        },
      };

      api.post.mockResolvedValue(mockResponse);

      const payload = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        role: 'parent',
      };

      const result = await profilesApi.register(payload);

      expect(api.post).toHaveBeenCalledWith('/profiles/auth/register/', payload);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getChildren', () => {
    it('should fetch children list', async () => {
      const mockResponse = {
        data: [
          { id: 1, nickname: 'Child 1', age: 5 },
          { id: 2, nickname: 'Child 2', age: 6 },
        ],
      };

      api.get.mockResolvedValue(mockResponse);

      const result = await profilesApi.getChildren({ parent: 1 });

      expect(api.get).toHaveBeenCalledWith('/profiles/children/', { params: { parent: 1 } });
      expect(result).toEqual(mockResponse.data);
    });

    it('should fetch children without params', async () => {
      const mockResponse = { data: [] };
      api.get.mockResolvedValue(mockResponse);

      const result = await profilesApi.getChildren();

      expect(api.get).toHaveBeenCalledWith('/profiles/children/', { params: {} });
      expect(result).toEqual([]);
    });
  });

  describe('getTeachers', () => {
    it('should fetch teachers list', async () => {
      const mockResponse = {
        data: [
          { id: 1, name: 'Teacher 1', email: 'teacher1@example.com' },
          { id: 2, name: 'Teacher 2', email: 'teacher2@example.com' },
        ],
      };

      api.get.mockResolvedValue(mockResponse);

      const result = await profilesApi.getTeachers();

      expect(api.get).toHaveBeenCalledWith('/profiles/teachers/', { params: {} });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getTeacher', () => {
    it('should fetch a single teacher by ID', async () => {
      const mockResponse = {
        data: { id: 1, name: 'Teacher 1', email: 'teacher1@example.com', bio: 'Bio' },
      };

      api.get.mockResolvedValue(mockResponse);

      const result = await profilesApi.getTeacher(1);

      expect(api.get).toHaveBeenCalledWith('/profiles/teachers/1/');
      expect(result).toEqual(mockResponse.data);
    });

    it('should return null for 404 errors', async () => {
      const error = {
        response: { status: 404 },
      };

      api.get.mockRejectedValue(error);

      const result = await profilesApi.getTeacher(999);

      expect(result).toBeNull();
    });

    it('should throw error for non-404 errors', async () => {
      const error = {
        response: { status: 500 },
      };

      api.get.mockRejectedValue(error);

      await expect(profilesApi.getTeacher(1)).rejects.toEqual(error);
    });
  });

  describe('createChild', () => {
    it('should create a new child', async () => {
      const mockResponse = {
        data: {
          id: 1,
          uuid: 'uuid-123',
          nickname: 'New Child',
          age: 5,
          learning_level: 'beginner',
        },
      };

      api.post.mockResolvedValue(mockResponse);

      const payload = {
        nickname: 'New Child',
        age: 5,
        parent_phone: '1234567890',
        learning_level: 'beginner',
        parent: 1,
      };

      const result = await profilesApi.createChild(payload);

      expect(api.post).toHaveBeenCalledWith('/profiles/children/', payload);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('updateChild', () => {
    it('should update an existing child', async () => {
      const mockResponse = {
        data: {
          id: 1,
          nickname: 'Updated Child',
          age: 6,
        },
      };

      api.put.mockResolvedValue(mockResponse);

      const payload = {
        nickname: 'Updated Child',
        age: 6,
      };

      const result = await profilesApi.updateChild(1, payload);

      expect(api.put).toHaveBeenCalledWith('/profiles/children/1/', payload);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('deleteChild', () => {
    it('should delete a child', async () => {
      const mockResponse = { data: { success: true } };
      api.delete.mockResolvedValue(mockResponse);

      const result = await profilesApi.deleteChild(1);

      expect(api.delete).toHaveBeenCalledWith('/profiles/children/1/');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getChildProgress', () => {
    it('should fetch child progress', async () => {
      const mockResponse = {
        data: {
          videosCompleted: 5,
          quizzesCompleted: 3,
          badges: ['badge1', 'badge2'],
        },
      };

      api.get.mockResolvedValue(mockResponse);

      const result = await profilesApi.getChildProgress(1);

      expect(api.get).toHaveBeenCalledWith('/profiles/children/1/progress/');
      expect(result).toEqual(mockResponse.data);
    });
  });
});

















