import * as lessonsApi from '../src/services/lessonsApi';
import api from '../src/api';

jest.mock('../src/api');

describe('Lessons API - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Collections API', () => {
    describe('getCollections', () => {
      it('should fetch collections with params', async () => {
        const mockCollections = [{ id: 1, name: 'Collection 1' }];
        api.get.mockResolvedValueOnce({ data: mockCollections });

        const result = await lessonsApi.getCollections({ page: 1 });

        expect(api.get).toHaveBeenCalledWith('lessons/collections/', {
          params: { page: 1 },
        });
        expect(result).toEqual(mockCollections);
      });

      it('should fetch collections without params', async () => {
        const mockCollections = [{ id: 1, name: 'Collection 1' }];
        api.get.mockResolvedValueOnce({ data: mockCollections });

        const result = await lessonsApi.getCollections();

        expect(api.get).toHaveBeenCalledWith('lessons/collections/', {
          params: {},
        });
        expect(result).toEqual(mockCollections);
      });

      it('should handle API errors', async () => {
        const error = new Error('API Error');
        api.get.mockRejectedValueOnce(error);

        await expect(lessonsApi.getCollections()).rejects.toThrow('API Error');
      });
    });

    describe('createCollection', () => {
      it('should create collection successfully', async () => {
        const payload = { name: 'New Collection', description: 'Test' };
        const mockResponse = { id: 1, ...payload };
        api.post.mockResolvedValueOnce({ data: mockResponse });

        const result = await lessonsApi.createCollection(payload);

        expect(api.post).toHaveBeenCalledWith('lessons/collections/', payload);
        expect(result).toEqual(mockResponse);
      });

      it('should handle creation errors', async () => {
        const error = {
          response: {
            status: 400,
            data: { name: ['Name is required'] },
          },
        };
        api.post.mockRejectedValueOnce(error);

        await expect(
          lessonsApi.createCollection({ description: 'Test' })
        ).rejects.toEqual(error);
      });
    });

    describe('getCollection', () => {
      it('should fetch single collection by ID', async () => {
        const mockCollection = { id: 1, name: 'Collection 1' };
        api.get.mockResolvedValueOnce({ data: mockCollection });

        const result = await lessonsApi.getCollection(1);

        expect(api.get).toHaveBeenCalledWith('lessons/collections/1/');
        expect(result).toEqual(mockCollection);
      });

      it('should handle 404 errors', async () => {
        const error = {
          response: { status: 404, data: { message: 'Not found' } },
        };
        api.get.mockRejectedValueOnce(error);

        await expect(lessonsApi.getCollection(999)).rejects.toEqual(error);
      });
    });

    describe('updateCollection', () => {
      it('should update collection successfully', async () => {
        const payload = { name: 'Updated Collection' };
        const mockResponse = { id: 1, ...payload };
        api.patch.mockResolvedValueOnce({ data: mockResponse });

        const result = await lessonsApi.updateCollection(1, payload);

        expect(api.patch).toHaveBeenCalledWith('lessons/collections/1/', payload);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('patchCollection', () => {
      it('should patch collection successfully', async () => {
        const payload = { name: 'Patched Collection' };
        const mockResponse = { id: 1, name: 'Patched Collection' };
        api.patch.mockResolvedValueOnce({ data: mockResponse });

        const result = await lessonsApi.patchCollection(1, payload);

        expect(api.patch).toHaveBeenCalledWith('lessons/collections/1/', payload);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('deleteCollection', () => {
      it('should delete collection successfully', async () => {
        api.delete.mockResolvedValueOnce({ data: {} });

        const result = await lessonsApi.deleteCollection(1);

        expect(api.delete).toHaveBeenCalledWith('lessons/collections/1/');
        expect(result).toEqual({});
      });

      it('should handle delete errors', async () => {
        const error = {
          response: { status: 404, data: { message: 'Not found' } },
        };
        api.delete.mockRejectedValueOnce(error);

        await expect(lessonsApi.deleteCollection(999)).rejects.toEqual(error);
      });
    });
  });

  describe('Lessons API', () => {
    describe('getLessons', () => {
      it('should fetch lessons with params', async () => {
        const mockLessons = [{ id: 1, title: 'Lesson 1' }];
        api.get.mockResolvedValueOnce({ data: mockLessons });

        const result = await lessonsApi.getLessons({ collection: 1 });

        expect(api.get).toHaveBeenCalledWith('lessons/lessons/', {
          params: { collection: 1 },
        });
        expect(result).toEqual(mockLessons);
      });

      it('should fetch all lessons without params', async () => {
        const mockLessons = [{ id: 1, title: 'Lesson 1' }];
        api.get.mockResolvedValueOnce({ data: mockLessons });

        const result = await lessonsApi.getLessons();

        expect(api.get).toHaveBeenCalledWith('lessons/lessons/', {
          params: {},
        });
        expect(result).toEqual(mockLessons);
      });
    });

    describe('createLesson', () => {
      it('should create lesson successfully', async () => {
        const payload = { title: 'New Lesson', collection: 1 };
        const mockResponse = { id: 1, ...payload };
        api.post.mockResolvedValueOnce({ data: mockResponse });

        const result = await lessonsApi.createLesson(payload);

        expect(api.post).toHaveBeenCalledWith('lessons/lessons/', payload, {});
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getLesson', () => {
      it('should fetch single lesson by ID', async () => {
        const mockLesson = { id: 1, title: 'Lesson 1' };
        api.get.mockResolvedValueOnce({ data: mockLesson });

        const result = await lessonsApi.getLesson(1);

        expect(api.get).toHaveBeenCalledWith('lessons/lessons/1/');
        expect(result).toEqual(mockLesson);
      });
    });

    describe('updateLesson', () => {
      it('should update lesson successfully', async () => {
        const payload = { title: 'Updated Lesson' };
        const mockResponse = { id: 1, ...payload };
        api.patch.mockResolvedValueOnce({ data: mockResponse });

        const result = await lessonsApi.updateLesson(1, payload);

        expect(api.patch).toHaveBeenCalledWith('lessons/lessons/1/', payload, {});
        expect(result).toEqual(mockResponse);
      });
    });

    describe('patchLesson', () => {
      it('should patch lesson successfully', async () => {
        const payload = { title: 'Patched Lesson' };
        const mockResponse = { id: 1, title: 'Patched Lesson' };
        api.patch.mockResolvedValueOnce({ data: mockResponse });

        const result = await lessonsApi.patchLesson(1, payload);

        expect(api.patch).toHaveBeenCalledWith('lessons/lessons/1/', payload, {});
        expect(result).toEqual(mockResponse);
      });
    });

    describe('deleteLesson', () => {
      it('should delete lesson successfully', async () => {
        api.delete.mockResolvedValueOnce({ data: {} });

        const result = await lessonsApi.deleteLesson(1);

        expect(api.delete).toHaveBeenCalledWith('lessons/lessons/1/');
        expect(result).toEqual({});
      });
    });

    describe('trackLessonProgress', () => {
      it('should track lesson progress successfully', async () => {
        const payload = { completed: true, timeSpent: 300 };
        const mockResponse = { id: 1, ...payload };
        api.post.mockResolvedValueOnce({ data: mockResponse });

        const result = await lessonsApi.trackLessonProgress(1, payload);

        expect(api.post).toHaveBeenCalledWith(
          'lessons/lessons/1/track-progress/',
          payload
        );
        expect(result).toEqual(mockResponse);
      });

      it('should track progress with empty payload', async () => {
        const mockResponse = { id: 1, completed: false };
        api.post.mockResolvedValueOnce({ data: mockResponse });

        const result = await lessonsApi.trackLessonProgress(1);

        expect(api.post).toHaveBeenCalledWith(
          'lessons/lessons/1/track-progress/',
          {}
        );
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Media Uploads API', () => {
    describe('getMediaUploads', () => {
      it('should fetch media uploads with params', async () => {
        const mockUploads = [{ id: 1, file: 'test.mp4' }];
        api.get.mockResolvedValueOnce({ data: mockUploads });

        const result = await lessonsApi.getMediaUploads({ lesson: 1 });

        expect(api.get).toHaveBeenCalledWith('lessons/media-uploads/', {
          params: { lesson: 1 },
        });
        expect(result).toEqual(mockUploads);
      });
    });

    describe('createMediaUpload', () => {
      it('should create media upload successfully', async () => {
        const payload = { file: 'test.mp4', lesson: 1 };
        const mockResponse = { id: 1, ...payload };
        api.post.mockResolvedValueOnce({ data: mockResponse });

        const result = await lessonsApi.createMediaUpload(payload);

        expect(api.post).toHaveBeenCalledWith('lessons/media-uploads/', expect.any(FormData), expect.objectContaining({
          timeout: expect.any(Number)
        }));
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getMediaUpload', () => {
      it('should fetch single media upload by ID', async () => {
        const mockUpload = { id: 1, file: 'test.mp4' };
        api.get.mockResolvedValueOnce({ data: mockUpload });

        const result = await lessonsApi.getMediaUpload(1);

        expect(api.get).toHaveBeenCalledWith('lessons/media-uploads/1/');
        expect(result).toEqual(mockUpload);
      });
    });

    describe('updateMediaUpload', () => {
      it('should update media upload successfully', async () => {
        const payload = { file: 'updated.mp4' };
        const mockResponse = { id: 1, ...payload };
        api.put.mockResolvedValueOnce({ data: mockResponse });

        const result = await lessonsApi.updateMediaUpload(1, payload);

        expect(api.put).toHaveBeenCalledWith('lessons/media-uploads/1/', payload);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('patchMediaUpload', () => {
      it('should patch media upload successfully', async () => {
        const payload = { file: 'patched.mp4' };
        const mockResponse = { id: 1, file: 'patched.mp4' };
        api.patch.mockResolvedValueOnce({ data: mockResponse });

        const result = await lessonsApi.patchMediaUpload(1, payload);

        expect(api.patch).toHaveBeenCalledWith('lessons/media-uploads/1/', payload);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('deleteMediaUpload', () => {
      it('should delete media upload successfully', async () => {
        api.delete.mockResolvedValueOnce({ data: {} });

        const result = await lessonsApi.deleteMediaUpload(1);

        expect(api.delete).toHaveBeenCalledWith('lessons/media-uploads/1/');
        expect(result).toEqual({});
      });
    });
  });
});

















