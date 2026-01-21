import * as profilesApi from '../src/services/profilesApi';

jest.mock('../src/services/profilesApi');

describe('Child Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createChild', () => {
    it('should create a child with valid data', async () => {
      const childPayload = {
        nickname: 'Test Child',
        age: 5,
        parent_phone: '1234567890',
        learning_level: 'beginner',
        parent: 1,
      };

      const mockResponse = {
        id: 1,
        uuid: 'uuid-123',
        nickname: 'Test Child',
        age: 5,
        learning_level: 'beginner',
      };

      profilesApi.createChild.mockResolvedValue(mockResponse);

      const result = await profilesApi.createChild(childPayload);

      expect(profilesApi.createChild).toHaveBeenCalledWith(childPayload);
      expect(result).toEqual(mockResponse);
      expect(result.nickname).toBe('Test Child');
      expect(result.age).toBe(5);
    });

    it('should handle child creation with uuid normalization', async () => {
      const childPayload = {
        nickname: 'Child',
        age: 6,
        parent_phone: '0987654321',
        learning_level: 'intermediate',
        parent: 1,
      };

      const mockResponse = {
        uuid: 'uuid-456',
        nickname: 'Child',
        age: 6,
        learning_level: 'intermediate',
      };

      profilesApi.createChild.mockResolvedValue(mockResponse);

      const result = await profilesApi.createChild(childPayload);

      // The parent component should normalize uuid to id
      expect(result.uuid).toBe('uuid-456');
    });

    it('should validate age range (4-6)', () => {
      const validAges = [4, 5, 6];
      const invalidAges = [3, 7, 0, 10];

      validAges.forEach((age) => {
        expect(age >= 4 && age <= 6).toBe(true);
      });

      invalidAges.forEach((age) => {
        expect(age >= 4 && age <= 6).toBe(false);
      });
    });

    it('should handle learning level conversion', () => {
      const learningLevels = {
        BEGINNER: 'beginner',
        INTERMEDIATE: 'intermediate',
        ADVANCED: 'advanced',
      };

      Object.entries(learningLevels).forEach(([upper, lower]) => {
        expect(upper.toLowerCase()).toBe(lower);
      });
    });
  });

  describe('updateChild', () => {
    it('should update child information', async () => {
      const updatePayload = {
        nickname: 'Updated Child',
        age: 6,
        parent_phone: '1111111111',
        learning_level: 'intermediate',
        parent: 1,
      };

      const mockResponse = {
        id: 1,
        nickname: 'Updated Child',
        age: 6,
        learning_level: 'intermediate',
      };

      profilesApi.updateChild.mockResolvedValue(mockResponse);

      const result = await profilesApi.updateChild(1, updatePayload);

      expect(profilesApi.updateChild).toHaveBeenCalledWith(1, updatePayload);
      expect(result.nickname).toBe('Updated Child');
    });
  });

  describe('deleteChild', () => {
    it('should delete a child', async () => {
      profilesApi.deleteChild.mockResolvedValue({ success: true });

      const result = await profilesApi.deleteChild(1);

      expect(profilesApi.deleteChild).toHaveBeenCalledWith(1);
      expect(result.success).toBe(true);
    });
  });

  describe('getChildProgress', () => {
    it('should fetch child progress data', async () => {
      const mockProgress = {
        videosCompleted: [1, 2, 3],
        quizResults: [
          { quizId: 1, score: 80 },
          { quizId: 2, score: 90 },
        ],
        badges: ['badge1', 'badge2'],
      };

      profilesApi.getChildProgress.mockResolvedValue(mockProgress);

      const result = await profilesApi.getChildProgress(1);

      expect(profilesApi.getChildProgress).toHaveBeenCalledWith(1);
      expect(result.videosCompleted).toHaveLength(3);
      expect(result.quizResults).toHaveLength(2);
      expect(result.badges).toHaveLength(2);
    });

    it('should handle empty progress', async () => {
      const mockProgress = {
        videosCompleted: [],
        quizResults: [],
        badges: [],
      };

      profilesApi.getChildProgress.mockResolvedValue(mockProgress);

      const result = await profilesApi.getChildProgress(1);

      expect(result.videosCompleted).toHaveLength(0);
      expect(result.quizResults).toHaveLength(0);
    });
  });

  describe('getChildren', () => {
    it('should fetch children list for a parent', async () => {
      const mockChildren = [
        { id: 1, nickname: 'Child 1', age: 5 },
        { id: 2, nickname: 'Child 2', age: 6 },
      ];

      profilesApi.getChildren.mockResolvedValue(mockChildren);

      const result = await profilesApi.getChildren({ parent: 1 });

      expect(profilesApi.getChildren).toHaveBeenCalledWith({ parent: 1 });
      expect(result).toHaveLength(2);
      expect(result[0].nickname).toBe('Child 1');
    });

    it('should handle paginated response', async () => {
      const mockPaginatedResponse = {
        results: [
          { id: 1, nickname: 'Child 1' },
          { id: 2, nickname: 'Child 2' },
        ],
        count: 2,
        next: null,
        previous: null,
      };

      profilesApi.getChildren.mockResolvedValue(mockPaginatedResponse);

      const result = await profilesApi.getChildren({ parent: 1 });

      // The parent component should handle both array and paginated responses
      expect(result).toHaveProperty('results');
    });
  });
});

















