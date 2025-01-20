const express = require('express');
const searchController = require('../controllers/searchController');
const router = express.Router();

router.post('/', searchController.addHistory);

router.get('/:id', searchController.getHistories)

module.exports = router;