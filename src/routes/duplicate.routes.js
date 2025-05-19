const express = require('express');
const { protect, restrictTo } = require('../controllers/auth.controller');
const { 
  findDuplicates,
  markAsDuplicate,
  resolveDuplicates
} = require('../controllers/duplicate.controller');

const router = express.Router();

// Protect all routes
router.use(protect);
router.use(restrictTo('admin', 'editor'));

// Duplicate detection routes
router.get('/check/:contentId', findDuplicates);
router.post('/mark/:contentId/duplicate-of/:originalId', markAsDuplicate);
router.post('/resolve', resolveDuplicates);

module.exports = router;
