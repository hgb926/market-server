const router = require('express').Router();
const connectDB = require('./../config/database')
const {ObjectId} = require("mongodb");
const moment = require('moment-timezone')
const {formatRelativeTime} = require('../util/timeFormat');

let db;
connectDB.then((client) => {
    db = client.db("market")
}).catch((err) => {
    console.log(err)
})

router.post('/add', async (req, res) => {
    const response = req.body;
    console.log(response);

    try {
        if (!response.title || !response.content || !response.images) {
            res.send('빈값 안됨')
            return;
        }

        const postData = {
            writerId: new ObjectId(response.writerId),
            writerInfo: response.writerInfo,
            title: response.title,
            images: response.images,
            price: response.price,
            suggestFlag: response.suggestFlag,
            content: response.content,
            category: response.category,
            wantPlace: response.wantPlace,
            likes: response.likes,
            chat: response.chat,
            viewCount: response.viewCount,
            createdAt: new Date(), // createdAt 추가
        };

        // MongoDB에 데이터 삽입
        const result = await db.collection('post').insertOne(postData);

        // 삽입 성공 응답
        res.status(200).json({
            message: '게시물이 성공적으로 저장되었습니다.',
            postId: result.insertedId, // MongoDB에서 생성된 ID 반환
        });
    } catch (e) {
        console.error(e);
        res.status(500).send('서버 에러');
    }
});


module.exports = router;