const { validateBody, schemas } = require('../../../src/middleware/validation.middleware');
const AppError = require('../../../src/utils/appError');

// Mock Express next function
const mockNext = jest.fn();

// Mock Express request and response
const mockReq = (body = {}) => ({
  body
});

const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn()
});

// Reset mocks before each test
beforeEach(() => {
  mockNext.mockReset();
});

describe('Validation Middleware', () => {
  describe('validateBody', () => {
    test('should pass validation when request body is valid', () => {
      // Given
      const req = mockReq({
        email: 'test@example.com',
        password: 'password123'
      });
      const res = mockRes();
      const middleware = validateBody(schemas.login);
      
      // When
      middleware(req, res, mockNext);
      
      // Then
      expect(mockNext).toHaveBeenCalledTimes(1);
      // Next should be called without an error
      expect(mockNext).toHaveBeenCalledWith();
    });
    
    test('should return error when request body is invalid', () => {
      // Given
      const req = mockReq({
        email: 'invalid-email',
        password: 'short'
      });
      const res = mockRes();
      const middleware = validateBody(schemas.login);
      
      // When
      middleware(req, res, mockNext);
      
      // Then
      expect(mockNext).toHaveBeenCalledTimes(1);
      // Next should be called with an error
      expect(mockNext.mock.calls[0][0]).toBeInstanceOf(AppError);
      expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
      expect(mockNext.mock.calls[0][0].message).toMatch(/email/);
    });
    
    test('should validate signup data correctly', () => {
      // Given
      const validReq = mockReq({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });
      const invalidReq = mockReq({
        name: 'T', // Too short
        email: 'invalid-email',
        password: 'short' // Too short
      });
      const res = mockRes();
      const middleware = validateBody(schemas.signup);
      
      // When - Valid data
      middleware(validReq, res, mockNext);
      
      // Then
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
      
      // Reset the mock
      mockNext.mockReset();
      
      // When - Invalid data
      middleware(invalidReq, res, mockNext);
      
      // Then
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext.mock.calls[0][0]).toBeInstanceOf(AppError);
      expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
    });
  });
}); 