import * as progressApi from '../src/services/progressApi';
import api from '../src/api';

jest.mock('../src/api');

describe('Progress API - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Badges API', () => {
    describe('getBadges', () => {
      it('should fetch badges with params', async () => {
        const mockBadges = [{ id: 1, name: 'Badge 1', description: 'Test' }];
        api.get.mockResolvedValueOnce({ data: mockBadges });

        const result = await progressApi.getBadges({ child: 1 });

        expect(api.get).toHaveBeenCalledWith('/progress/badges/', {
          params: { child: 1 },
        });
        expect(result).toEqual(mockBadges);
      });

      it('should fetch all badges without params', async () => {
        const mockBadges = [{ id: 1, name: 'Badge 1' }];
        api.get.mockResolvedValueOnce({ data: mockBadges });

        const result = await progressApi.getBadges();

        expect(api.get).toHaveBeenCalledWith('/progress/badges/', {
          params: {},
        });
        expect(result).toEqual(mockBadges);
      });

      it('should handle API errors', async () => {
        const error = new Error('API Error');
        api.get.mockRejectedValueOnce(error);

        await expect(progressApi.getBadges()).rejects.toThrow('API Error');
      });
    });

    describe('getBadge', () => {
      it('should fetch single badge by ID', async () => {
        const mockBadge = { id: 1, name: 'Badge 1', description: 'Test' };
        api.get.mockResolvedValueOnce({ data: mockBadge });

        const result = await progressApi.getBadge(1);

        expect(api.get).toHaveBeenCalledWith('/progress/badges/1/');
        expect(result).toEqual(mockBadge);
      });

      it('should handle 404 errors', async () => {
        const error = {
          response: { status: 404, data: { message: 'Not found' } },
        };
        api.get.mockRejectedValueOnce(error);

        await expect(progressApi.getBadge(999)).rejects.toEqual(error);
      });
    });
  });

  describe('Child Badges API', () => {
    describe('getChildBadges', () => {
      it('should fetch child badges with params', async () => {
        const mockChildBadges = [
          { id: 1, child: 1, badge: 1, earned_at: '2024-01-01' },
        ];
        api.get.mockResolvedValueOnce({ data: mockChildBadges });

        const result = await progressApi.getChildBadges({ child: 1 });

        expect(api.get).toHaveBeenCalledWith('/progress/child-badges/', {
          params: { child: 1 },
        });
        expect(result).toEqual(mockChildBadges);
      });

      it('should fetch all child badges without params', async () => {
        const mockChildBadges = [{ id: 1, child: 1, badge: 1 }];
        api.get.mockResolvedValueOnce({ data: mockChildBadges });

        const result = await progressApi.getChildBadges();

        expect(api.get).toHaveBeenCalledWith('/progress/child-badges/', {
          params: {},
        });
        expect(result).toEqual(mockChildBadges);
      });
    });

    describe('getChildBadge', () => {
      it('should fetch single child badge by ID', async () => {
        const mockChildBadge = {
          id: 1,
          child: 1,
          badge: 1,
          earned_at: '2024-01-01',
        };
        api.get.mockResolvedValueOnce({ data: mockChildBadge });

        const result = await progressApi.getChildBadge(1);

        expect(api.get).toHaveBeenCalledWith('/progress/child-badges/1/');
        expect(result).toEqual(mockChildBadge);
      });
    });
  });

  describe('Progress API', () => {
    describe('getProgress', () => {
      it('should fetch progress with params', async () => {
        const mockProgress = [
          {
            id: 1,
            child: 1,
            lesson: 1,
            completed: true,
            progress_percentage: 100,
          },
        ];
        api.get.mockResolvedValueOnce({ data: mockProgress });

        const result = await progressApi.getProgress({ child: 1 });

        expect(api.get).toHaveBeenCalledWith('/progress/progress/', {
          params: { child: 1 },
        });
        expect(result).toEqual(mockProgress);
      });

      it('should fetch all progress without params', async () => {
        const mockProgress = [{ id: 1, child: 1, lesson: 1 }];
        api.get.mockResolvedValueOnce({ data: mockProgress });

        const result = await progressApi.getProgress();

        expect(api.get).toHaveBeenCalledWith('/progress/progress/', {
          params: {},
        });
        expect(result).toEqual(mockProgress);
      });

      it('should handle paginated responses', async () => {
        const paginatedResponse = {
          results: [{ id: 1, child: 1, lesson: 1 }],
          count: 1,
          next: null,
          previous: null,
        };
        api.get.mockResolvedValueOnce({ data: paginatedResponse });

        const result = await progressApi.getProgress();

        expect(result).toEqual(paginatedResponse);
      });
    });

    describe('getProgressItem', () => {
      it('should fetch single progress item by ID', async () => {
        const mockProgress = {
          id: 1,
          child: 1,
          lesson: 1,
          completed: true,
          progress_percentage: 100,
        };
        api.get.mockResolvedValueOnce({ data: mockProgress });

        const result = await progressApi.getProgressItem(1);

        expect(api.get).toHaveBeenCalledWith('/progress/progress/1/');
        expect(result).toEqual(mockProgress);
      });

      it('should handle 404 errors', async () => {
        const error = {
          response: { status: 404, data: { message: 'Not found' } },
        };
        api.get.mockRejectedValueOnce(error);

        await expect(progressApi.getProgressItem(999)).rejects.toEqual(error);
      });
    });
  });
});

















