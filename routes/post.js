const express = require('express');
const multer = require('multer');
const postController = require('../controllers/postController');

const router = express.Router();

// Multer 설정
const upload = multer({ storage: multer.memoryStorage() });

// 게시글 추가
router.post('/add', upload.array('images', 10), postController.addPost);

// 게시글 조회
router.get('/', postController.getPosts);

// 게시글 상세 조회
router.post('/detail', postController.getPostDetail);

// 좋아요/좋아요 취소
router.post('/reaction', postController.handleReaction);

// 게시글 삭제
router.delete('/:id', postController.deletePost);

// 좋아요한 게시글 조회
router.get('/liked/:userId', postController.getLikedPosts);

// 판매 내역 조회
router.get('/sold/:userId', postController.getSoldLists);

// 게시글 검색
router.get('/search/:keyword', postController.searchPosts)

// 판매 상태 변경
router.post('/status', postController.changeStatus)

module.exports = router;