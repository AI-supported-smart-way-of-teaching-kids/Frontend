import api from '../src/api';
import axios from 'axios';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    multiRemove: jest.fn(),
}));

// Mock Axios
jest.mock('axios', () => {
    const mockAxios = {
        create: jest.fn(() => mockAxios),
        post: jest.fn(),
        get: jest.fn(),
        put: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
        interceptors: {
            request: { use: jest.fn(), eject: jest.fn() },
            response: { use: jest.fn(), eject: jest.fn() },
        },
        defaults: { headers: { common: {} } },
    };
    return mockAxios;
});

describe('API Interceptor Logic Verification', () => {
    let requestInterceptor;

    // We need to capture the interceptor function that api.jsx registers
    beforeAll(() => {
        // The api.jsx file runs the axios.create and interceptors.use calls on import
        // We need to inspect what was passed to interceptors.request.use
        // Since we are importing 'api', the module code executes.
        // However, checking the mock state *after* import is tricky if we don't reload.
        // But since api.jsx logic is static, we can check the calls.
    });

    it('should register a request interceptor', () => {
        expect(axios.create).toHaveBeenCalled();
        expect(axios.interceptors.request.use).toHaveBeenCalled();
        // Capture the success handler (first argument)
        requestInterceptor = axios.interceptors.request.use.mock.calls[0][0];
    });

    it('should set application/json for standard objects', async () => {
        const config = { headers: {}, data: { foo: 'bar' } };
        const result = await requestInterceptor(config);
        expect(result.headers['Content-Type']).toBe('application/json');
    });

    it('should set Content-Type to undefined for FormData', async () => {
        // Mock a FormData object
        class MockFormData {
            append() { }
        }
        const formData = new MockFormData();

        const config = { headers: {}, data: formData };
        const result = await requestInterceptor(config);

        // Should be undefined so browser can set boundary
        expect(result.headers['Content-Type']).toBeUndefined();
    });

    it('should detect FormData via duck typing (append function)', async () => {
        const duckTypedFormData = { append: () => { } };
        const config = { headers: {}, data: duckTypedFormData };
        const result = await requestInterceptor(config);
        expect(result.headers['Content-Type']).toBeUndefined();
    });

    it('should respect existing Content-Type', async () => {
        const config = {
            headers: { 'Content-Type': 'multipart/form-data' },
            data: { foo: 'bar' }
        };
        const result = await requestInterceptor(config);
        // Should remain as is, though technically if it's not FormData it might be wrong,
        // but the interceptor logic says "if not content-type, set json". 
        // So if it IS set, it should preserve it.
        expect(result.headers['Content-Type']).toBe('multipart/form-data');
    });
});
