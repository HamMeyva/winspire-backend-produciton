/**
 * Test runner script with options
 * 
 * Usage:
 * node test/run-tests.js [options]
 * 
 * Options:
 *  --unit: Run only unit tests
 *  --integration: Run only integration tests
 *  --watch: Run tests in watch mode
 *  --coverage: Generate coverage report
 *  --verbose: Show detailed test output
 */

const { spawnSync } = require('child_process');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  unit: args.includes('--unit'),
  integration: args.includes('--integration'),
  watch: args.includes('--watch'),
  coverage: args.includes('--coverage'),
  verbose: args.includes('--verbose')
};

// Determine which tests to run
let testMatch = [];

if (options.unit && !options.integration) {
  testMatch.push('--testMatch=**/test/unit/**/*.test.js');
} else if (options.integration && !options.unit) {
  testMatch.push('--testMatch=**/test/integration/**/*.test.js');
}

// Configure Jest command
const jestArgs = [
  ...testMatch,
  options.watch ? '--watch' : '',
  options.coverage ? '--coverage' : '',
  options.verbose ? '--verbose' : '',
  '--runInBand', // Run tests serially for clearer output and to avoid MongoDB connection issues
].filter(Boolean);

console.log('Running tests with options:', options);
console.log('Jest command:', 'jest', jestArgs.join(' '));

// Run Jest with the configured options
const result = spawnSync('npx', ['jest', ...jestArgs], {
  stdio: 'inherit',
  shell: true
});

process.exit(result.status); 