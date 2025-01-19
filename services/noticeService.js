const { ObjectId } = require('mongodb');
const { formatRelativeTime } = require('../util/timeFormat');
const connectDB = require('../config/database');

let db;
let noticeGlobalClient = {};
let globalChangeStream;

// 데이터베이스 연결
connectDB
    .then((client) => {
        db = client.db('market');
        initializeSSE();
    })
    .catch((err) => {
        console.error(err);
    });

// SSE 초기화
const initializeSSE = () => {
    const condition = [{ $match: { operationType: 'insert' } }];
    globalChangeStream = db.collection('notice').watch(condition);

    globalChangeStream.on('change', async (change) => {
        const newNotice = change.fullDocument;
        const diffInMs = new Date() - new Date(newNotice.createdAt);
        newNotice.createdAt = formatRelativeTime(diffInMs);

        if (noticeGlobalClient[newNotice.writerId]) {
            noticeGlobalClient[newNotice.writerId].write(`data: ${JSON.stringify(newNotice)}\n\n`);
        }
    });
};

// SSE 연결 처리
const handleSSE = (req, res) => {
    const userId = req.query.userId;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    noticeGlobalClient[userId] = res;

    req.on('close', () => {
        delete noticeGlobalClient[userId];
    });
};

// 알림 조회
const getNoticesByWriterId = async (writerId) => {
    const result = await db.collection('notice').find({ writerId: new ObjectId(writerId) }).toArray();
    result.forEach((notice) => {
        const diffInMs = new Date() - new Date(notice.createdAt);
        notice.createdAt = formatRelativeTime(diffInMs);
    });
    return result;
};

// 알림 클릭
const markNoticeAsClicked = async (noticeId) => {
    return await db.collection('notice').updateOne(
        { _id: new ObjectId(noticeId) },
        { $set: { isClicked: true } }
    );
};

// 모든 알림 클릭 처리
const markAllNoticesAsClicked = async (writerId) => {
    await db.collection('notice').updateMany(
        { writerId: new ObjectId(writerId) },
        { $set: { isClicked: true } }
    );
};

module.exports = {
    handleSSE,
    getNoticesByWriterId,
    markNoticeAsClicked,
    markAllNoticesAsClicked,
};