const postService = require('../services/postService');

// 게시글 추가
const addPost = async (req, res) => {
    try {
        const result = await postService.addPost(req.body, req.files);
        res.status(200).json(result);
    } catch (err) {
        console.error(err);
        res.status(400).json('게시글 추가에 실패하였습니다');
    }
};

// 게시글 목록 조회
const getPosts = async (req, res) => {
    try {
        const posts = await postService.getPosts();
        res.status(200).json(posts);
    } catch (err) {
        console.error(err);
        res.status(400).json('게시글 목록을 찾지 못하였습니다');
    }
};

// 게시글 상세 조회
const getPostDetail = async (req, res) => {
    try {
        const result = await postService.getPostDetail(req.body.id);
        res.status(200).json(result);
    } catch (err) {
        console.error(err);
        res.status(400).json({message: '게시글을 찾지 못하였습니다'});
    }
};

// 좋아요/좋아요 취소
const handleReaction = async (req, res) => {
    try {
        const result = await postService.handleReaction(req.body);
        res.status(200).send(result);
    } catch (err) {
        console.error(err);
        res.status(400).json('좋아요를 찾지 못하였습니다');
    }
};

// 게시글 삭제
const deletePost = async (req, res) => {
    try {
        await postService.deletePost(req.params.id);
        res.status(200).json('성공');
    } catch (err) {
        console.error(err);
        res.status(400).json('삭제할 게시글을 찾지못하였습니다.');
    }
};

// 좋아요한 게시글 목록 조회
const getLikedPosts = async (req, res) => {
    try {
        const result = await postService.getLikedPosts(req.params.userId);
        res.status(200).json(result);
    } catch (err) {
        console.error(err);
        res.status(400).json('게시글을 찾지 못하였습니다');
    }
};

const searchPosts = async (req, res) => {
    try {
        const result = await postService.searchPosts(req.params.keyword);
        if (result) {
            res.status(200).json(result);
        } else {
            res.status(200).json({message: "검색 결과가 없습니다"})
        }
    } catch (e) {

    }
}

module.exports = {
    addPost,
    getPosts,
    getPostDetail,
    handleReaction,
    deletePost,
    getLikedPosts,
    searchPosts
};