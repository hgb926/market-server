const express = require('express');
const multer = require('multer');
const chatController = require('../controllers/chatController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// SSE 설정
router.get('/sse', chatController.connectGlobalSSE);
router.get('/sse/room', chatController.connectRoomSSE);

// 요청 처리
router.post('/request', chatController.createChatRoom);
router.get('/chat-detail', chatController.getChatDetails);
router.get('/detail', chatController.getChatRoomInfo);
router.post('/list', chatController.getUserChatList);
router.delete('/delete/:id', chatController.deleteChatRoom);

module.exports = router;