import * as coreApi from '../src/services/coreApi';
import api from '../src/api';

jest.mock('../src/api');

describe('Core API - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Audit Logs API', () => {
    describe('getAuditLogs', () => {
      it('should fetch audit logs with params', async () => {
        const mockLogs = [
          {
            id: 1,
            action: 'CREATE',
            model: 'Child',
            object_id: 1,
            timestamp: '2024-01-01T00:00:00Z',
          },
        ];
        api.get.mockResolvedValueOnce({ data: mockLogs });

        const result = await coreApi.getAuditLogs({ user: 1 });

        expect(api.get).toHaveBeenCalledWith('/core/audit-logs/', {
          params: { user: 1 },
        });
        expect(result).toEqual(mockLogs);
      });

      it('should fetch all audit logs without params', async () => {
        const mockLogs = [{ id: 1, action: 'CREATE', model: 'Child' }];
        api.get.mockResolvedValueOnce({ data: mockLogs });

        const result = await coreApi.getAuditLogs();

        expect(api.get).toHaveBeenCalledWith('/core/audit-logs/', {
          params: {},
        });
        expect(result).toEqual(mockLogs);
      });

      it('should handle paginated responses', async () => {
        const paginatedResponse = {
          results: [{ id: 1, action: 'CREATE' }],
          count: 1,
          next: null,
          previous: null,
        };
        api.get.mockResolvedValueOnce({ data: paginatedResponse });

        const result = await coreApi.getAuditLogs();

        expect(result).toEqual(paginatedResponse);
      });

      it('should handle API errors', async () => {
        const error = new Error('API Error');
        api.get.mockRejectedValueOnce(error);

        await expect(coreApi.getAuditLogs()).rejects.toThrow('API Error');
      });
    });

    describe('getAuditLog', () => {
      it('should fetch single audit log by ID', async () => {
        const mockLog = {
          id: 1,
          action: 'CREATE',
          model: 'Child',
          object_id: 1,
          timestamp: '2024-01-01T00:00:00Z',
        };
        api.get.mockResolvedValueOnce({ data: mockLog });

        const result = await coreApi.getAuditLog(1);

        expect(api.get).toHaveBeenCalledWith('/core/audit-logs/1/');
        expect(result).toEqual(mockLog);
      });

      it('should handle 404 errors', async () => {
        const error = {
          response: { status: 404, data: { message: 'Not found' } },
        };
        api.get.mockRejectedValueOnce(error);

        await expect(coreApi.getAuditLog(999)).rejects.toEqual(error);
      });
    });
  });

  describe('Health API', () => {
    describe('getHealth', () => {
      it('should fetch health status successfully', async () => {
        const mockHealth = {
          status: 'healthy',
          database: 'connected',
          timestamp: '2024-01-01T00:00:00Z',
        };
        api.get.mockResolvedValueOnce({ data: mockHealth });

        const result = await coreApi.getHealth();

        expect(api.get).toHaveBeenCalledWith('/core/health/');
        expect(result).toEqual(mockHealth);
      });

      it('should handle unhealthy status', async () => {
        const mockHealth = {
          status: 'unhealthy',
          database: 'disconnected',
          timestamp: '2024-01-01T00:00:00Z',
        };
        api.get.mockResolvedValueOnce({ data: mockHealth });

        const result = await coreApi.getHealth();

        expect(result.status).toBe('unhealthy');
      });

      it('should handle health check errors', async () => {
        const error = new Error('Health check failed');
        api.get.mockRejectedValueOnce(error);

        await expect(coreApi.getHealth()).rejects.toThrow('Health check failed');
      });
    });
  });
});

















