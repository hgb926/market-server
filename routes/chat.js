const express = require('express');
const multer = require('multer');
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3');
const {ObjectId} = require('mongodb');
const connectDB = require('./../config/database');
const {formatSendTime} = require('./../util/timeFormat');
const {formatRelativeTime} = require("../util/timeFormat");


const router = express.Router();
const app = express();


// 요청 본문 크기 제한 증가
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

// S3 클라이언트 설정
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Multer 설정
const upload = multer({storage: multer.memoryStorage()});

let clients = {}; // { userId: response }

router.get('/sse', (req, res) => {
    // 클라이언트의 userId를 query로 받는다
    const userId = req.query.userId;
    console.log(`sse in userId : `, userId)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // client 연결을 userId에 매핑
    clients[userId] = res;

    // 연결 종료 시 연결 삭제
    req.on('close', () => {
        delete clients[userId];
    });
});


let db;
let changeStream;
connectDB.then((client) => {
        db = client.db("market");
        const condition = [
            { $match : { operationType : "insert" } }
        ]

        changeStream = db.collection('chatMsg').watch(condition);

        changeStream.on('change', async (change) => {

            const newMessage = change.fullDocument
            const foundUser = await db.collection('user').findOne({
                _id: new ObjectId(newMessage.writer)
            });
            const foundRoom = await db.collection('chatRoom').findOne({
                _id: new ObjectId(newMessage.room)
            });
            const takerId = newMessage.taker.toString();

            const payload = {
                ...newMessage,
                nickname: foundUser.nickname,
                postTitle: foundRoom.postInfo.postTitle,
                profileUrl: foundUser.profileUrl
            }

            if (clients[takerId]) {
                clients[takerId].write(`data: ${JSON.stringify(payload)}\n\n`);
                console.log("전송 완료")
            }

        })

    })
    .catch((err) => {
        console.error(err);
    });

// 파일 업로드 함수
const uploadToS3 = async (file) => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `uploads/${Date.now()}_${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    const command = new PutObjectCommand(params);
    const result = await s3.send(command);

    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
};


router.post('/request', async (req, res) => {

    try {
        const flag = await db.collection('chatRoom').findOne({
            'customerInfo.customerId': new ObjectId(req.body.customerInfo.customerId),
            'sellerInfo.sellerId': new ObjectId(req.body.sellerInfo.sellerId),
            'postInfo.postId': new ObjectId(req.body.postInfo.postId),
        });

        if (!flag) {
            const result = await db.collection('chatRoom').insertOne({
                customerInfo: {
                    ...req.body.customerInfo,
                    customerId: new ObjectId(req.body.customerInfo.customerId), // ObjectId로 변환
                },
                sellerInfo: {
                    ...req.body.sellerInfo,
                    sellerId: new ObjectId(req.body.sellerInfo.sellerId), // ObjectId로 변환
                },
                postInfo: {
                    ...req.body.postInfo,
                    postId: new ObjectId(req.body.postInfo.postId), // ObjectId로 변환
                },
                date: new Date(),
                lastMsg: '',
                lastChatTime: new Date(),
            });
            res.status(200).json({
                chatId: result.insertedId,
            });
        } else {
            res.status(200).json({
                chatId: flag._id
            })
        }
    } catch (e) {
        console.log(e)
        res.status(400).json({
            message: false,
        });
    }
})

// 한 채팅방의 대화목록 조회
router.get('/chat-detail',async (req, res) => {

    try {
        console.log(`req.query.id = ${req.query.id}`)
        const result = await db.collection('chatMsg').find({
            room: new ObjectId(req.query.id)
        }).toArray();
        for (const ele of result) {
            ele['formatTime'] = formatSendTime(ele.date)
        }

        res.status(200).json(result)
    } catch (e) {
        console.log(e)
        res.status(500)
    }
})

// 한 채팅방에 대한 정보 조회
router.get('/detail', async (req, res) => {
    try {
        const result = await db.collection('chatRoom').findOne({
            _id: new ObjectId(req.query.id)
        })

        res.status(200).json(result)
    } catch (e) {
        console.log(e)
        res.status(500)
    }
})

// 한 유저의 채팅 리스트 조회
router.post('/list', async (req, res) => {
    console.log('req.body in list ',req.body.id)
    try {
        let result = await db.collection('chatRoom').find({
            $or: [
                { 'customerInfo.customerId': new ObjectId(req.body.id) },
                { 'sellerInfo.sellerId': new ObjectId(req.body.id) },
            ]
        }).toArray();

        if (result) {
            for (const ele of result) {
                if (ele.lastChatTime) {
                    const diffInMs = new Date() - new Date(ele.lastChatTime);
                    ele.relativeTime = formatRelativeTime(diffInMs)
                }
            }
            res.status(200).json(result)
        } else {
            console.log("결과 없음")
            res.status(400)
        }
    } catch (e) {
        console.log(e)
        res.status(400)
    }
})


router.delete('/delete/:id', async (req, res) => {
    console.log(req.params.id)
    try {
        await db.collection('chatRoom').deleteOne({
            _id: new ObjectId(req.params.id),
        });
        await db.collection('chatMsg').deleteMany({
            room: new ObjectId(req.params.id),
        })
        res.status(200).send("삭제 성공")
    } catch (e) {
        console.log(e)
        res.status(400)
    }
})


module.exports = router;

