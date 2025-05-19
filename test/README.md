# Testing Guide for Windspire Backend

This guide explains how to run tests for the Windspire lifestyle hacks app backend.

## Prerequisites

1. MongoDB must be installed and running locally
2. Node.js 16+ installed
3. All dependencies installed (`npm install`)
4. A `.env.test` file in the project root (sample provided below)

## Test Structure

The tests are organized as follows:

- **Unit Tests**: Test individual components in isolation
  - `test/unit/models`: Test database models
  - `test/unit/controllers`: Test API controllers
  - `test/unit/middleware`: Test Express middleware
  - `test/unit/services`: Test business logic services
  - `test/unit/utils`: Test utility functions

- **Integration Tests**: Test API endpoints and component interactions
  - `test/integration`: End-to-end API tests

## Running Tests

We've set up several npm scripts to run tests:

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests in watch mode (for development)
npm run test:watch

# Generate test coverage report
npm run test:coverage

# Run with detailed output
npm run test:verbose

# Run all tests with coverage and verbose output
npm run test:all
```

You can also run tests directly with more options:

```bash
node test/run-tests.js [--unit] [--integration] [--watch] [--coverage] [--verbose]
```

## Test Database

Tests use a separate MongoDB database named `windspire-test` to avoid affecting development or production data.

## Sample `.env.test` File

Create a `.env.test` file in the project root with the following content:

```
NODE_ENV=test
PORT=5001

# MongoDB
MONGODB_URI=mongodb://localhost:27017/windspire-test

# JWT
JWT_SECRET=test-jwt-secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=test-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Stripe (test keys)
STRIPE_SECRET_KEY=sk_test_your_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# OpenAI (can use dummy value for tests)
OPENAI_API_KEY=dummy-api-key

# Admin credentials for seeding
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=adminpassword123

# Disable scheduler for tests
ENABLE_SCHEDULER=false
```

## Running Specific Tests

To run a specific test file:

```bash
npx jest path/to/test-file.test.js
```

To run tests matching a specific pattern:

```bash
npx jest -t "pattern to match"
```

## Test Coverage

After running tests with coverage (`npm run test:coverage`), view the HTML report:

```bash
open coverage/lcov-report/index.html
```

## Troubleshooting

If you encounter issues with tests:

1. Make sure MongoDB is running
2. Check that your `.env.test` file is configured correctly
3. Try clearing the test database manually:
   ```
   mongo windspire-test --eval "db.dropDatabase()"
   ```
4. Ensure all dependencies are installed: `npm install` 