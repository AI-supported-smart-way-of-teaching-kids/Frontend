import * as recommendationApi from '../src/services/recommendationApi';
import api from '../src/api';

jest.mock('../src/api');

describe('Recommendation API - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecommendations', () => {
    it('should fetch recommendations without childId', async () => {
      const mockRecommendations = [
        { id: 1, lesson: 1, reason: 'Based on progress' },
      ];
      api.get.mockResolvedValueOnce({ data: mockRecommendations });

      const result = await recommendationApi.getRecommendations();

      expect(api.get).toHaveBeenCalledWith('/ai/recommendations/', {
        params: {},
      });
      expect(result).toEqual(mockRecommendations);
    });

    it('should fetch recommendations with childId', async () => {
      const mockRecommendations = [
        { id: 1, lesson: 1, child: 1, reason: 'Personalized' },
      ];
      api.get.mockResolvedValueOnce({ data: mockRecommendations });

      const result = await recommendationApi.getRecommendations({ childId: 1 });

      expect(api.get).toHaveBeenCalledWith('/ai/recommendations/', {
        params: { child: 1, child_id: 1 },
      });
      expect(result).toEqual(mockRecommendations);
    });

    it('should handle array response format', async () => {
      const mockRecommendations = [{ id: 1 }, { id: 2 }];
      api.get.mockResolvedValueOnce({ data: mockRecommendations });

      const result = await recommendationApi.getRecommendations();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('should handle paginated response format (results property)', async () => {
      const paginatedResponse = {
        results: [{ id: 1 }, { id: 2 }],
        count: 2,
      };
      api.get.mockResolvedValueOnce({ data: paginatedResponse });

      const result = await recommendationApi.getRecommendations();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('should handle single object response', async () => {
      const singleRecommendation = { id: 1, lesson: 1 };
      api.get.mockResolvedValueOnce({ data: singleRecommendation });

      const result = await recommendationApi.getRecommendations();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(singleRecommendation);
    });

    it('should return empty array when no data', async () => {
      api.get.mockResolvedValueOnce({ data: null });

      const result = await recommendationApi.getRecommendations();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      api.get.mockRejectedValueOnce(error);

      await expect(
        recommendationApi.getRecommendations()
      ).rejects.toThrow('API Error');
    });
  });

  describe('getRecommendation', () => {
    it('should fetch single recommendation by ID', async () => {
      const mockRecommendation = {
        id: 1,
        lesson: 1,
        child: 1,
        reason: 'Based on progress',
        score: 0.95,
      };
      api.get.mockResolvedValueOnce({ data: mockRecommendation });

      const result = await recommendationApi.getRecommendation(1);

      expect(api.get).toHaveBeenCalledWith('/ai/recommendations/1/');
      expect(result).toEqual(mockRecommendation);
    });

    it('should throw error when ID is missing', async () => {
      await expect(recommendationApi.getRecommendation()).rejects.toThrow(
        'Recommendation ID is required'
      );
    });

    it('should throw error when ID is null', async () => {
      await expect(recommendationApi.getRecommendation(null)).rejects.toThrow(
        'Recommendation ID is required'
      );
    });

    it('should throw error when ID is undefined', async () => {
      await expect(
        recommendationApi.getRecommendation(undefined)
      ).rejects.toThrow('Recommendation ID is required');
    });

    it('should handle 404 errors', async () => {
      const error = {
        response: { status: 404, data: { message: 'Not found' } },
      };
      api.get.mockRejectedValueOnce(error);

      await expect(recommendationApi.getRecommendation(999)).rejects.toEqual(
        error
      );
    });
  });
});

















