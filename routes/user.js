const router = require('express').Router();

const connectDB = require('./../config/database')
const passport = require("passport");
const bcrypt = require("bcrypt");

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

    passport.authenticate('local', (err, user, info) => {
        if (err) return res.status(500).json({ message: '서버 오류', error: err });
        if (!user) return res.status(401).json({ message: info.message });

        req.login(user, (err) => {
            if (err) return res.status(500).json({ message: '로그인 실패', error: err });

            res.status(200).json({
                message: '로그인 성공',
                user: { email: user.email, nickname: user.nickname }
            });
        });
    })(req, res, next);
});

module.exports = router;