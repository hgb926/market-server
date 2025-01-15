const express = require('express');
const {ObjectId} = require('mongodb');
const {formatRelativeTime} = require('./../util/timeFormat');
const connectDB = require("../config/database");
const router = express.Router();

let noticeGlobalClient = {};
// =========================  SSE 설정  ======================== //

router.get('/sse', (req, res) => {
    const userId = req.query.userId;
    console.log(`notice sse in userId : `, userId)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    noticeGlobalClient[userId] = res;

    req.on('close', () => {
        delete noticeGlobalClient[userId]
    })
})



let db;
let globalChangeStream;
connectDB
    .then((client) => {
        db = client.db("market");
        const condition = [
            { $match: { operationType: "insert" } }
        ]

        globalChangeStream = db.collection('notice').watch(condition)

        globalChangeStream.on('change', async (change) => {
            const newNotice = change.fullDocument
            const diffInMs = new Date() - new Date(newNotice.createdAt)
            newNotice.createdAt = formatRelativeTime(diffInMs)

            if (noticeGlobalClient[newNotice.writerId]) {
                noticeGlobalClient[newNotice.writerId].write(`data: ${JSON.stringify(newNotice)}\n\n`)
            }
        })
    })
    .catch((err) => {
        console.error(err);
    });


router.get('/:id', async (req, res) => {
    try {

        const result = await db.collection('notice').find({
            writerId: new ObjectId(req.params.id)
        }).toArray();
        for (const notice of result) {
            const diffInMs = new Date() - new Date(notice.createdAt);
            notice.createdAt = formatRelativeTime(diffInMs)
        }


        if (result) {
            res.status(200).json(result)
        } else {
            res.status(400).json("데이터없음")
        }
    } catch (e) {
        res.status(400).json("실패")
        console.log(e)
    }
})

router.post('/click', async (req, res) => {
    try {
        let foundNotice = await db.collection('notice').updateOne(
            {_id: new ObjectId(req.body.noticeId)},
            {$set: {isClicked: true}}
        );
        res.status(200).json(foundNotice)
    } catch (e) {
        res.status(400).json("실패")
    }
})

router.post('/click-all', async (req, res) => {
    try {
        console.log('req.body.writerId : ', req.body.writerId)
        let result = await db.collection('notice').updateMany(
            { writerId: new ObjectId(req.body.writerId) },
            { $set: {isClicked: true}}
        );
        console.log('modify result \n', result)
        res.status(200).json("ok")
    } catch (e) {
        res.status(400)
    }
})


module.exports = router;