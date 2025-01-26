const express = require('express');
const noticeController = require('../controllers/noticeController');

const router = express.Router();

// SSE 설정
router.get('/sse', noticeController.connectSSE);

// 알림 조회
router.get('/:id', noticeController.getNoticesByWriterId);

// 알림 클릭
router.post('/click', noticeController.markNoticeAsClicked);

// 모든 알림 클릭 처리
router.post('/click-all', noticeController.markAllNoticesAsClicked);

module.exports = router;