const chatService = require('../services/chatService');

// SSE 글로벌 연결
const connectGlobalSSE = (req, res) => {
    chatService.handleGlobalSSE(req, res);
};

// SSE 룸 연결
const connectRoomSSE = (req, res) => {
    chatService.handleRoomSSE(req, res);
};

// 채팅방 생성
const createChatRoom = async (req, res) => {
    try {
        const result = await chatService.createChatRoom(req.body);
        res.status(200).json(result);
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: false });
    }
};

// 채팅 상세 조회
const getChatDetails = async (req, res) => {
    try {
        const result = await chatService.getChatDetails(req.query.id);
        res.status(200).json(result);
    } catch (err) {
        console.error(err);
        res.status(500);
    }
};

// 채팅방 정보 조회
const getChatRoomInfo = async (req, res) => {
    try {
        const result = await chatService.getChatRoomInfo(req.query.id);
        res.status(200).json(result);
    } catch (err) {
        console.error(err);
        res.status(500);
    }
};

// 유저의 채팅 리스트 조회
const getUserChatList = async (req, res) => {
    try {
        const result = await chatService.getUserChatList(req.body.id);
        res.status(200).json(result);
    } catch (err) {
        console.error(err);
        res.status(400);
    }
};

// 채팅방 삭제
const deleteChatRoom = async (req, res) => {
    try {
        await chatService.deleteChatRoom(req.params.id);
        res.status(200).send("삭제 성공");
    } catch (err) {
        console.error(err);
        res.status(400);
    }
};

module.exports = {
    connectGlobalSSE,
    connectRoomSSE,
    createChatRoom,
    getChatDetails,
    getChatRoomInfo,
    getUserChatList,
    deleteChatRoom,
};