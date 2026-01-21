import * as quizApi from '../src/services/quizApi';
import api from '../src/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../src/api');
jest.mock('@react-native-async-storage/async-storage');

describe('Quiz API - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue();
  });

  describe('getQuizzes', () => {
    it('should fetch quizzes and convert to camelCase', async () => {
      const mockQuizzes = [
        { id: 1, title: 'Quiz 1', time_limit: 300 },
        { id: 2, title: 'Quiz 2', time_limit: 600 },
      ];
      api.get.mockResolvedValueOnce({ data: mockQuizzes });

      const result = await quizApi.getQuizzes();

      expect(api.get).toHaveBeenCalledWith('/quizzes/quizzes/');
      expect(result[1].timeLimit).toBe(300);
      expect(result[2].timeLimit).toBe(600);
      expect(result[1].time_limit).toBeUndefined();
    });

    it('should handle paginated response format', async () => {
      const paginatedResponse = {
        results: [{ id: 1, title: 'Quiz 1', time_limit: 300 }],
        count: 1,
      };
      api.get.mockResolvedValueOnce({ data: paginatedResponse });

      const result = await quizApi.getQuizzes();

      expect(result[1]).toBeDefined();
      expect(result[1].timeLimit).toBe(300);
    });

    it('should handle single quiz object response', async () => {
      const singleQuiz = { id: 1, title: 'Quiz 1', time_limit: 300 };
      api.get.mockResolvedValueOnce({ data: singleQuiz });

      const result = await quizApi.getQuizzes();

      expect(result[1]).toBeDefined();
    });

    it('should cache quizzes in AsyncStorage', async () => {
      const mockQuizzes = [{ id: 1, title: 'Quiz 1', time_limit: 300 }];
      api.get.mockResolvedValueOnce({ data: mockQuizzes });

      await quizApi.getQuizzes();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@app_quizzes_v1',
        expect.stringContaining('"1"')
      );
    });

    it('should handle 403 Forbidden errors', async () => {
      const error = {
        response: { status: 403 },
        config: { _retry: false },
      };
      api.get.mockRejectedValueOnce(error);
      AsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ 1: { id: 1, title: 'Cached Quiz' } })
      );

      const result = await quizApi.getQuizzes();

      expect(result).toEqual({ 1: { id: 1, title: 'Cached Quiz' } });
    });

    it('should fallback to AsyncStorage on error', async () => {
      const error = new Error('Network error');
      api.get.mockRejectedValueOnce(error);
      AsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ 1: { id: 1, title: 'Cached Quiz' } })
      );

      const result = await quizApi.getQuizzes();

      expect(result).toEqual({ 1: { id: 1, title: 'Cached Quiz' } });
    });

    it('should return empty object when cache is empty', async () => {
      const error = new Error('Network error');
      api.get.mockRejectedValueOnce(error);
      AsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await quizApi.getQuizzes();

      expect(result).toEqual({});
    });
  });

  describe('getQuiz', () => {
    it('should fetch single quiz and convert to camelCase', async () => {
      const mockQuiz = { id: 1, title: 'Quiz 1', time_limit: 300 };
      api.get.mockResolvedValueOnce({ data: mockQuiz });

      const result = await quizApi.getQuiz(1);

      expect(api.get).toHaveBeenCalledWith('/quizzes/quizzes/1/');
      expect(result.timeLimit).toBe(300);
      expect(result.time_limit).toBeUndefined();
    });

    it('should handle null video field', async () => {
      const mockQuiz = { id: 1, title: 'Quiz 1', video: null };
      api.get.mockResolvedValueOnce({ data: mockQuiz });

      const result = await quizApi.getQuiz(1);

      expect(result.video).toBeNull();
    });

    it('should fallback to AsyncStorage on error', async () => {
      const error = new Error('Network error');
      api.get.mockRejectedValueOnce(error);
      AsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ 1: { id: 1, title: 'Cached Quiz' } })
      );

      const result = await quizApi.getQuiz(1);

      expect(result).toEqual({ id: 1, title: 'Cached Quiz' });
    });

    it('should return null when quiz not found', async () => {
      const error = new Error('Network error');
      api.get.mockRejectedValueOnce(error);
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({}));

      const result = await quizApi.getQuiz(999);

      expect(result).toBeNull();
    });
  });

  describe('createQuiz', () => {
    it('should create quiz and convert to snake_case for API', async () => {
      const quizData = {
        title: 'New Quiz',
        timeLimit: 300,
        video: 1,
      };
      const mockResponse = { id: 1, title: 'New Quiz', time_limit: 300 };
      api.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await quizApi.createQuiz(quizData);

      expect(api.post).toHaveBeenCalledWith('/quizzes/quizzes/', {
        title: 'New Quiz',
        time_limit: 300,
        video: 1,
      });
      expect(result.timeLimit).toBe(300);
    });

    it('should update local cache after creation', async () => {
      const quizData = { title: 'New Quiz', timeLimit: 300 };
      const mockResponse = { id: 1, title: 'New Quiz', time_limit: 300 };
      api.post.mockResolvedValueOnce({ data: mockResponse });
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({}));

      await quizApi.createQuiz(quizData);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should handle creation errors', async () => {
      const error = {
        response: {
          status: 400,
          data: { title: ['Title is required'] },
        },
      };
      api.post.mockRejectedValueOnce(error);

      await expect(quizApi.createQuiz({})).rejects.toEqual(error);
    });
  });

  describe('updateQuiz', () => {
    it('should update quiz successfully', async () => {
      const quizData = { title: 'Updated Quiz', timeLimit: 600 };
      const mockResponse = { id: 1, title: 'Updated Quiz', time_limit: 600 };
      api.put.mockResolvedValueOnce({ data: mockResponse });
      AsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ 1: { id: 1, title: 'Old Quiz' } })
      );

      const result = await quizApi.updateQuiz(1, quizData);

      expect(api.put).toHaveBeenCalledWith('/quizzes/quizzes/1/', {
        title: 'Updated Quiz',
        time_limit: 600,
      });
      expect(result.timeLimit).toBe(600);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('patchQuiz', () => {
    it('should patch quiz successfully', async () => {
      const quizData = { title: 'Patched Quiz' };
      const mockResponse = { id: 1, title: 'Patched Quiz', time_limit: 300 };
      api.patch.mockResolvedValueOnce({ data: mockResponse });
      AsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ 1: { id: 1, title: 'Old Quiz', timeLimit: 300 } })
      );

      const result = await quizApi.patchQuiz(1, quizData);

      expect(api.patch).toHaveBeenCalledWith('/quizzes/quizzes/1/', {
        title: 'Patched Quiz',
      });
      expect(result.title).toBe('Patched Quiz');
    });
  });

  describe('deleteQuiz', () => {
    it('should delete quiz successfully', async () => {
      api.delete.mockResolvedValueOnce({ data: {} });
      AsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ 1: { id: 1, title: 'Quiz' } })
      );

      const result = await quizApi.deleteQuiz(1);

      expect(api.delete).toHaveBeenCalledWith('/quizzes/quizzes/1/');
      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Quiz Attempts API', () => {
    describe('getQuizAttempts', () => {
      it('should fetch quiz attempts with filters', async () => {
        const mockAttempts = [
          { id: 1, quiz: 1, child: 1, score: 80 },
        ];
        api.get.mockResolvedValueOnce({ data: mockAttempts });

        const result = await quizApi.getQuizAttempts({ child: 1 });

        expect(api.get).toHaveBeenCalledWith('/quizzes/attempts/', {
          params: { child: 1 },
        });
        expect(result).toEqual(mockAttempts);
      });

      it('should handle paginated response', async () => {
        const paginatedResponse = {
          results: [{ id: 1, quiz: 1, child: 1 }],
          count: 1,
        };
        api.get.mockResolvedValueOnce({ data: paginatedResponse });

        const result = await quizApi.getQuizAttempts();

        expect(result).toEqual([{ id: 1, quiz: 1, child: 1 }]);
      });

      it('should fallback to AsyncStorage on error', async () => {
        const error = new Error('Network error');
        api.get.mockRejectedValueOnce(error);
        AsyncStorage.getItem.mockResolvedValueOnce(
          JSON.stringify([{ id: 1, quiz: 1 }])
        );

        const result = await quizApi.getQuizAttempts();

        expect(result).toEqual([{ id: 1, quiz: 1 }]);
      });
    });

    describe('getQuizAttempt', () => {
      it('should fetch single attempt by ID', async () => {
        const mockAttempt = { id: 1, quiz: 1, child: 1, score: 80 };
        api.get.mockResolvedValueOnce({ data: mockAttempt });

        const result = await quizApi.getQuizAttempt(1);

        expect(api.get).toHaveBeenCalledWith('/quizzes/attempts/1/');
        expect(result).toEqual(mockAttempt);
      });

      it('should fallback to AsyncStorage on error', async () => {
        const error = new Error('Network error');
        api.get.mockRejectedValueOnce(error);
        AsyncStorage.getItem.mockResolvedValueOnce(
          JSON.stringify([{ id: 1, quiz: 1 }])
        );

        const result = await quizApi.getQuizAttempt(1);

        expect(result).toEqual({ id: 1, quiz: 1 });
      });
    });

    describe('createQuizAttempt', () => {
      it('should create quiz attempt successfully', async () => {
        const attemptData = { quiz: 1, child: 1, answers: {} };
        const mockResponse = { id: 1, ...attemptData };
        api.post.mockResolvedValueOnce({ data: mockResponse });
        AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([]));

        const result = await quizApi.createQuizAttempt(attemptData);

        expect(api.post).toHaveBeenCalledWith('/quizzes/attempts/', attemptData);
        expect(result).toEqual(mockResponse);
        expect(AsyncStorage.setItem).toHaveBeenCalled();
      });
    });

    describe('submitQuizAttempt', () => {
      it('should submit quiz attempt successfully', async () => {
        const attemptData = { id: 1, quiz: 1, answers: {}, score: 80 };
        const mockResponse = { id: 1, ...attemptData, completed: true };
        api.post.mockResolvedValueOnce({ data: mockResponse });
        AsyncStorage.getItem.mockResolvedValueOnce(
          JSON.stringify([{ id: 1, quiz: 1 }])
        );

        const result = await quizApi.submitQuizAttempt(attemptData);

        expect(api.post).toHaveBeenCalledWith(
          '/quizzes/attempts/submit/',
          attemptData
        );
        expect(result.completed).toBe(true);
      });
    });

    describe('updateQuizAttempt', () => {
      it('should update quiz attempt successfully', async () => {
        const attemptData = { answers: { 1: 'A' } };
        const mockResponse = { id: 1, quiz: 1, ...attemptData };
        api.put.mockResolvedValueOnce({ data: mockResponse });
        AsyncStorage.getItem.mockResolvedValueOnce(
          JSON.stringify([{ id: 1, quiz: 1 }])
        );

        const result = await quizApi.updateQuizAttempt(1, attemptData);

        expect(api.put).toHaveBeenCalledWith('/quizzes/attempts/1/', attemptData);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('patchQuizAttempt', () => {
      it('should patch quiz attempt successfully', async () => {
        const attemptData = { score: 90 };
        const mockResponse = { id: 1, quiz: 1, score: 90 };
        api.patch.mockResolvedValueOnce({ data: mockResponse });
        AsyncStorage.getItem.mockResolvedValueOnce(
          JSON.stringify([{ id: 1, quiz: 1, score: 80 }])
        );

        const result = await quizApi.patchQuizAttempt(1, attemptData);

        expect(api.patch).toHaveBeenCalledWith('/quizzes/attempts/1/', attemptData);
        expect(result.score).toBe(90);
      });
    });

    describe('deleteQuizAttempt', () => {
      it('should delete quiz attempt successfully', async () => {
        api.delete.mockResolvedValueOnce({ data: {} });
        AsyncStorage.getItem.mockResolvedValueOnce(
          JSON.stringify([{ id: 1, quiz: 1 }])
        );

        const result = await quizApi.deleteQuizAttempt(1);

        expect(api.delete).toHaveBeenCalledWith('/quizzes/attempts/1/');
        expect(result).toBe(true);
      });
    });
  });
});

















