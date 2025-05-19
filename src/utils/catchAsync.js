/**
 * Wraps async functions to avoid try-catch blocks in controllers
 * @param {Function} fn - The async function to wrap
 * @returns {Function} Express middleware function that catches any errors
 */
module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}; 