const router = require('express').Router();

const connectDB = require('./../config/database')
const passport = require("passport");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');

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

router.get('/user', authenticateJWT, (req, res) => {
    res.status(200).json(req.user); // JWT에서 디코딩된 유저 정보 반환
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

router.post('/register', async (req, res) => {
    try {

        // 비밀번호 해싱
        const hashed = await bcrypt.hash(req.body.password, 10);

        // 사용자 데이터 삽입
        let result = await db.collection('user').insertOne({
            email: req.body.email,
            password: hashed,
            nickname: req.body.nickname,
            address: req.body.address,
            zoneCode: req.body.zoneCode,
            profileUrl: req.body.image
        });

        // 성공 응답
        res.status(200).json({
            message: '회원가입이 성공적으로 완료되었습니다.',
            data: result
        });
    } catch (error) {
        console.error('회원가입 중 오류 발생:', error);
        res.status(500).json({
            message: '회원가입 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

router.post('/login', async (req, res, next) => {
    if (!req.body.email || !req.body.password) {
        return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });
    }
    console.log(req.body)

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
    console.log('user!! , \n' , user)
    res.status(200).json({user: user})
})

router.get('/logout', (req, res) => {
    res.clearCookie('authToken', { path: '/' });
    res.status(200).json({ message: '로그아웃 성공' });
});

module.exports = router;