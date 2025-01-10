const router = require('express').Router();
const multer = require("multer");
const connectDB = require('./../config/database')
const passport = require("passport");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const {ObjectId} = require("mongodb");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// S3 클라이언트 설정
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const upload = multer({ storage: multer.memoryStorage() });

// S3에 사진 업로드 함수
const uploadToS3 = async (file) => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `profile-images/${Date.now()}_${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    const command = new PutObjectCommand(params);
    await s3.send(command);

    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
};


// JWT 인증 미들웨어
const authenticateJWT = (req, res, next) => {
    const token = req.cookies.authToken; // 쿠키에서 토큰 가져오기
    if (!token) {
        return res.status(401).json({ message: '인증 토큰 없음' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: '유효하지 않은 토큰' });
        }
        req.user = decoded; // 디코딩된 유저 정보 저장
        next();
    });
};

router.get('/user', authenticateJWT, async (req, res) => {
    try {
        // JWT에서 디코딩된 유저 정보(req.user.id)를 이용해 데이터베이스에서 상세 정보
        const user = await db.collection('user').findOne({ _id: new ObjectId(req.user.id) });

        if (!user) {
            return res.status(404).json({ message: '유저 정보를 찾을 수 없습니다.' });
        }


        res.status(200).json({
            id: user._id,
            email: user.email,
            nickname: user.nickname,
            address: user.address,
            zoneCode: user.zoneCode,
            profileUrl: user.profileUrl,
            iat: req.user.iat,
            exp: req.user.exp,
        });
    } catch (error) {
        console.error('유저 정보를 가져오는 중 오류 발생:', error);
        res.status(500).json({ message: '서버 오류', error: error.message });
    }
});


let db;
connectDB.then((client) => {
    db = client.db("market")
}).catch((err) => {
    console.log(err)
})


router.get('/send-code', (req, res) => {
    const code = Math.floor(Math.random() * 9000) + 1000;
    res.send(code.toString()); // 문자열로 변환
});

router.post("/register", upload.single("image"), async (req, res) => {
    try {
        // 필수 데이터 검증
        if (!req.body.email || !req.body.password || !req.body.nickname) {
            return res.status(400).json({ message: "필수 데이터를 입력해주세요." });
        }

        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        // 프로필 사진 업로드
        let profileUrl = null;
        if (req.file) {
            profileUrl = await uploadToS3(req.file);
        }

        // 사용자 데이터 삽입
        const result = await db.collection("user").insertOne({
            email: req.body.email,
            password: hashedPassword,
            nickname: req.body.nickname,
            address: req.body.address,
            zoneCode: req.body.zoneCode,
            profileUrl: profileUrl, // S3에 업로드된 URL 저장
        });

        // 성공 응답
        res.status(200).json({
            message: "회원가입이 성공적으로 완료되었습니다.",
            data: result,
        });
    } catch (error) {
        console.error("회원가입 중 오류 발생:", error);
        res.status(500).json({
            message: "회원가입 중 오류가 발생했습니다.",
            error: error.message,
        });
    }
});
router.post('/login', async (req, res, next) => {
    if (!req.body.email || !req.body.password) {
        return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });
    }

    passport.authenticate('local', (err, user, info) => {
        if (err) return res.status(500).json({ message: '서버 오류', error: err });
        if (!user) return res.status(401).json({ message: info.message });

        req.login(user, (err) => {
            if (err) return res.status(500).json({ message: '로그인 실패', error: err });

            // JWT 생성
            const jwt = require('jsonwebtoken');
            const expiresIn = req.body.autoLogin ? '30d' : '1d';
            const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
                expiresIn: '7d', // 7일 유효
            });

            // HTTP-Only 쿠키에 저장
            res.cookie('authToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // HTTPS에서만 동작
                maxAge: req.body.autoLogin ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 자동로그인: 30일, 일반로그인: 1일
            });

            res.status(200).json({user});
        });
    })(req, res, next);
});

router.get('/time', (req, res) => {
    let user = req.user;
    res.status(200).json({user: user})
})

router.get('/logout', (req, res) => {
    res.clearCookie('authToken', { path: '/' });
    res.status(200).json({ message: '로그아웃 성공' });
});

module.exports = router;