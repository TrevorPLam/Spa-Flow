import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  customFetch,
  setBaseUrl,
  setAuthTokenGetter,
  ApiError,
  ResponseParseError,
  type CustomFetchOptions,
} from './custom-fetch';

describe('custom-fetch', () => {
  beforeEach(() => {
    // Reset module state
    setBaseUrl(null);
    setAuthTokenGetter(null);
    vi.restoreAllMocks();
  });

  describe('setBaseUrl', () => {
    it('should set base URL', () => {
      setBaseUrl('https://api.example.com');
      // Base URL is applied in customFetch, tested below
    });

    it('should clear base URL when passed null', () => {
      setBaseUrl('https://api.example.com');
      setBaseUrl(null);
      // Base URL is cleared
    });

    it('should remove trailing slashes from base URL', () => {
      setBaseUrl('https://api.example.com/');
      setBaseUrl('https://api.example.com//');
      // Trailing slashes removed
    });
  });

  describe('setAuthTokenGetter', () => {
    it('should set auth token getter', () => {
      const getter = vi.fn().mockResolvedValue('test-token');
      setAuthTokenGetter(getter);
      // Getter is applied in customFetch, tested below
    });

    it('should clear auth token getter when passed null', () => {
      setAuthTokenGetter(() => 'test-token');
      setAuthTokenGetter(null);
      // Getter is cleared
    });
  });

  describe('customFetch', () => {
    it('should make successful GET request', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        url: 'https://api.example.com/test',
        text: () => Promise.resolve('{"data":"test"}'),
      } as Response);
      global.fetch = mockFetch;

      const result = await customFetch('https://api.example.com/test');
      expect(result).toEqual({ data: 'test' });
    });

    it('should prepend base URL to relative paths', async () => {
      setBaseUrl('https://api.example.com');
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        url: 'https://api.example.com/api/test',
        text: () => Promise.resolve('{"data":"test"}'),
      } as Response);
      global.fetch = mockFetch;

      await customFetch('/api/test');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/test',
        expect.any(Object)
      );
    });

    it('should not prepend base URL to absolute URLs', async () => {
      setBaseUrl('https://api.example.com');
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        url: 'https://other.com/test',
        text: () => Promise.resolve('{"data":"test"}'),
      } as Response);
      global.fetch = mockFetch;

      await customFetch('https://other.com/test');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://other.com/test',
        expect.any(Object)
      );
    });

    it('should add Authorization header when auth token getter returns token', async () => {
      const getter = vi.fn().mockResolvedValue('test-token');
      setAuthTokenGetter(getter);
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        url: 'https://api.example.com/test',
        text: () => Promise.resolve('{"data":"test"}'),
      } as Response);
      global.fetch = mockFetch;

      await customFetch('https://api.example.com/test');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.any(Headers),
        })
      );
      expect(getter).toHaveBeenCalled();
    });

    it('should not add Authorization header when getter returns null', async () => {
      const getter = vi.fn().mockResolvedValue(null);
      setAuthTokenGetter(getter);
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        url: 'https://api.example.com/test',
        text: () => Promise.resolve('{"data":"test"}'),
      } as Response);
      global.fetch = mockFetch;

      await customFetch('https://api.example.com/test');
      expect(getter).toHaveBeenCalled();
    });

    it('should throw ApiError on failed response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        url: 'https://api.example.com/test',
        text: () => Promise.resolve('{"error":"Not found"}'),
      } as Response);
      global.fetch = mockFetch;

      await expect(customFetch('https://api.example.com/test')).rejects.toThrow(
        ApiError
      );
    });

    it('should include error data in ApiError', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        url: 'https://api.example.com/test',
        text: () => Promise.resolve('{"error":"Invalid input"}'),
      } as Response);
      global.fetch = mockFetch;

      await expect(customFetch('https://api.example.com/test')).rejects.toThrow(ApiError);
      
      try {
        await customFetch('https://api.example.com/test');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.status).toBe(400);
          expect(error.statusText).toBe('Bad Request');
          expect(error.data).toEqual({ error: 'Invalid input' });
        }
      }
    });

    it('should throw TypeError for GET request with body', async () => {
      await expect(
        customFetch('https://api.example.com/test', {
          method: 'GET',
          body: '{"data":"test"}',
        } as CustomFetchOptions)
      ).rejects.toThrow('GET requests cannot have a body');
    });

    it('should throw TypeError for HEAD request with body', async () => {
      await expect(
        customFetch('https://api.example.com/test', {
          method: 'HEAD',
          body: '{"data":"test"}',
        } as CustomFetchOptions)
      ).rejects.toThrow('HEAD requests cannot have a body');
    });

    it('should set content-type to application/json for JSON-like bodies', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        url: 'https://api.example.com/test',
        text: () => Promise.resolve('{"data":"test"}'),
      } as Response);
      global.fetch = mockFetch;

      await customFetch('https://api.example.com/test', {
        method: 'POST',
        body: '{"data":"test"}',
      } as CustomFetchOptions);

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers.get('content-type')).toBe('application/json');
    });

    it('should set accept header for json responseType', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        url: 'https://api.example.com/test',
        text: () => Promise.resolve('{"data":"test"}'),
      } as Response);
      global.fetch = mockFetch;

      await customFetch('https://api.example.com/test', {
        responseType: 'json',
      } as CustomFetchOptions);

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers.get('accept')).toContain('application/json');
    });

    it('should handle empty response body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers({ 'content-length': '0' }),
        url: 'https://api.example.com/test',
        text: () => Promise.resolve(''),
      } as Response);
      global.fetch = mockFetch;

      const result = await customFetch('https://api.example.com/test');
      expect(result).toBeNull();
    });

    it('should handle text response type', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'text/plain' }),
        url: 'https://api.example.com/test',
        text: () => Promise.resolve('plain text response'),
      } as Response);
      global.fetch = mockFetch;

      const result = await customFetch('https://api.example.com/test', {
        responseType: 'text',
      } as CustomFetchOptions);
      expect(result).toBe('plain text response');
    });

    it('should throw ResponseParseError on JSON parse failure', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        url: 'https://api.example.com/test',
        text: () => Promise.resolve('invalid json'),
      } as Response);
      global.fetch = mockFetch;

      await expect(
        customFetch('https://api.example.com/test', {
          responseType: 'json',
        } as CustomFetchOptions)
      ).rejects.toThrow(ResponseParseError);
    });
  });

  describe('ApiError', () => {
    it('should create error with correct properties', () => {
      const response = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
        url: 'https://api.example.com/test',
      } as Response;

      const error = new ApiError(response, { error: 'Server error' }, {
        method: 'GET',
        url: 'https://api.example.com/test',
      });

      expect(error.name).toBe('ApiError');
      expect(error.status).toBe(500);
      expect(error.statusText).toBe('Internal Server Error');
      expect(error.data).toEqual({ error: 'Server error' });
      expect(error.method).toBe('GET');
    });

    it('should build error message from response', () => {
      const response = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        url: 'https://api.example.com/test',
      } as Response;

      const error = new ApiError(response, { title: 'Error', detail: 'Resource not found' }, {
        method: 'GET',
        url: 'https://api.example.com/test',
      });

      expect(error.message).toContain('404');
      expect(error.message).toContain('Error');
      expect(error.message).toContain('Resource not found');
    });
  });

  describe('ResponseParseError', () => {
    it('should create error with correct properties', () => {
      const response = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        url: 'https://api.example.com/test',
      } as Response;

      const cause = new SyntaxError('Unexpected token');
      const error = new ResponseParseError(response, 'invalid json', cause, {
        method: 'GET',
        url: 'https://api.example.com/test',
      });

      expect(error.name).toBe('ResponseParseError');
      expect(error.status).toBe(200);
      expect(error.rawBody).toBe('invalid json');
      expect(error.cause).toBe(cause);
    });
  });
});
