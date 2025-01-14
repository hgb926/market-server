const express = require('express');
const {ObjectId} = require('mongodb');
const {formatRelativeTime} = require('./../util/timeFormat');
const connectDB = require("../config/database");
const router = express.Router();

let db;
connectDB
    .then((client) => {
        db = client.db("market");
    })
    .catch((err) => {
        console.error(err);
    });
// sse 설정도 해야함

router.get('/:id', async (req, res) => {
    try {
        console.log(req.params.id)
        const result = await db.collection('notice').find({
            writerId: new ObjectId(req.params.id)
        }).toArray();
        for (const notice of result) {
            const diffInMs = new Date() - new Date(notice.createdAt);
            notice.createdAt = formatRelativeTime(diffInMs)
        }
        console.log(result)
        console.log('result \n ',result)

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


module.exports = router;