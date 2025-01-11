const express = require('express');
const multer = require('multer');
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3');
const {ObjectId} = require('mongodb');
const connectDB = require('./../config/database');
const {formatRelativeTime} = require('./../util/timeFormat');

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

let db;
connectDB
    .then((client) => {
        db = client.db("market");
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

router.get('/detail',async (req, res) => {
    try {
        const result = await db.collection('chatRoom').findOne({
            _id: new ObjectId(req.query.id)
        });
        res.status(200).json(result)
    } catch (e) {
        console.log(e)
        res.status(500)
    }
})

module.exports = router;

