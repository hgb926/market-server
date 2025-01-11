const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { ObjectId } = require('mongodb');
const connectDB = require('./../config/database');
const { formatRelativeTime } = require('./../util/timeFormat');

const router = express.Router();
const app = express();

// 요청 본문 크기 제한 증가
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// S3 클라이언트 설정
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Multer 설정
const upload = multer({ storage: multer.memoryStorage() });

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


router.post('/request', async (req, res)=>{
    try {
        console.log(req.body)
        const result = await db.collection('chatRoom').insertOne({
            customerInfo: req.body.customerInfo,
            sellerInfo: req.body.sellerInfo,
            postInfo: req.body.postInfo,
            date: new Date(),
            lastMsg: '',
            lastChatTime: new Date(),
        });
        res.status(200).json({
            chatId: result.insertedId,
        });
    } catch (e) {
        console.log(e)
        res.status(400).json({
            message: false,
        });
    }
})

module.exports = router;

