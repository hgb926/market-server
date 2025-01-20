const express = require('express');
const searchController = require('../controllers/searchController');
const router = express.Router();

// 검색 기록 등록
router.post('/', searchController.addHistory);

// 검색 기록 조회
router.get('/:id', searchController.getHistories)

// 검색 기록 삭제
router.delete('/:historyId', searchController.deleteHistory)

// 검색 기록 전체 삭제
router.delete('/all/:id', searchController.deleteHistories)

module.exports = router;