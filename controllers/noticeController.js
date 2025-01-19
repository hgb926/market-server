const noticeService = require('../services/noticeService');

// SSE 연결
const connectSSE = (req, res) => {
    noticeService.handleSSE(req, res);
};

// 알림 조회
const getNoticesByWriterId = async (req, res) => {
    try {
        const result = await noticeService.getNoticesByWriterId(req.params.id);
        res.status(200).json(result);
    } catch (err) {
        console.error(err);
        res.status(400).json('알림을 찾을 수 없습니다');
    }
};

// 알림 클릭
const markNoticeAsClicked = async (req, res) => {
    try {
        const result = await noticeService.markNoticeAsClicked(req.body.noticeId);
        res.status(200).json(result);
    } catch (err) {
        console.error(err);
        res.status(400).json('알림을 찾지 못하였습니다');
    }
};

// 모든 알림 클릭 처리
const markAllNoticesAsClicked = async (req, res) => {
    try {
        await noticeService.markAllNoticesAsClicked(req.body.writerId);
        res.status(200).json('ok');
    } catch (err) {
        console.error(err);
        res.status(400).json('알림 모두읽기에 실패하였습니다.');
    }
};

module.exports = {
    connectSSE,
    getNoticesByWriterId,
    markNoticeAsClicked,
    markAllNoticesAsClicked,
};