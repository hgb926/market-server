const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { ObjectId } = require('mongodb');
const connectDB = require('./../config/database');

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

console.log("AWS_ACCESS_KEY_ID:", process.env.AWS_ACCESS_KEY_ID ? "Set" : "Not Set");
console.log("AWS_SECRET_ACCESS_KEY:", process.env.AWS_SECRET_ACCESS_KEY ? "Set" : "Not Set");
console.log("AWS_REGION:", process.env.AWS_REGION);

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

// 라우터: 게시글 추가
router.post('/add', upload.array('images', 10), async (req, res) => {
    try {
        const { title, content, category, price, suggestFlag, writerId, writerInfo, wantPlace, tradeType } = req.body;

        if (!title || !content) {
            return res.status(400).send('모든 필드를 입력해주세요.');
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).send('이미지를 업로드해주세요.');
        }

        // S3에 이미지 업로드
        const imageUrls = await Promise.all(req.files.map(uploadToS3));

        const postData = {
            writerId: new ObjectId(writerId),
            writerInfo: JSON.parse(writerInfo),
            title,
            images: imageUrls, // 업로드된 이미지 URL 배열
            price: parseInt(price, 10),
            suggestFlag: suggestFlag === 'true',
            content,
            wantPlace,
            tradeType,
            distance: 0,
            likes: 0,
            chats: 0,
            viewCount: 0,
            status: '판매 중',
            createdAt: new Date(),
            category,
        };

        const result = await db.collection('post').insertOne(postData);

        res.status(200).json({
            message: '게시글이 성공적으로 등록되었습니다.',
            postId: result.insertedId,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('서버 오류');
    }
});

// 라우터: 게시글 조회
router.get('/', async (req, res) => {
    try {
        const posts = await db.collection('post').find().toArray();
        res.status(200).json(posts);
    } catch (e) {
        console.error(e);
    }
});

module.exports = router;