const express = require('express');
const app = express()
const { ObjectId } = require('mongodb');
const env = require('dotenv').config()
const connectDB = require('./config/database.js');
const session = require('express-session')
const cookieParser = require('cookie-parser');
const passport = require('passport')
const LocalStrategy = require('passport-local')
const moment = require("moment-timezone");
const bcrypt = require('bcrypt')
const MongoStore = require('connect-mongo')
const cors = require('cors')

app.use(cookieParser())
app.use(passport.initialize())
app.use(session({
    secret: '암호화에 쓸 비번',
    resave: false, // 유저가 요청을 보낼때마다 세션을 갱신할건지
    saveUninitialized: false, // 로그인 안해도 세션 만들것인지
    cookie : { maxAge : 60 * 60 * 1000 }, // 1시간 유효, 세션 document 유효시간 변경 가능
    store : MongoStore.create({
        mongoUrl : process.env.MONGO_URL, // DB접속용 url,
        dbName : 'market', // db네임
    })
}))
app.use(passport.session())

// post요청 console (req.body 쉽게 읽기)
app.use(express.json())
app.use(express.urlencoded({extended: true}))

const corsOptions = {
    origin: [process.env.FRONT_URL, process.env.AWS_S3_URL],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

let db;
connectDB.then((client) => {
    console.log("DB연결 성공");
    db = client.db("market");
    app.listen(process.env.PORT, () => { // 서버 띄우는 코드
        console.log('http://localhost:8080에서 서버 실행중')
    })
}).catch((err) => {
    console.log(err)
})

// req.login() 쓰면 자동실행됨
passport.serializeUser((user, done) => {
    process.nextTick(() => {
        done(null, {
            id : user._id,
            username : user.nickname,
        })
    })
})

// 유저가 보낸 쿠키 분석하는 모듈
// 이 코드가 있으면 하위의 어느 API에서나 req.user로 유저의 정보를 가져올 수 있다.
passport.deserializeUser(async (user, done) => {
    const result = await db.collection('user').findOne({_id: new ObjectId(user.id)});
    delete result.password
    process.nextTick(() => {
        done(null, result) // 쿠키가 이상없으면 현재 로그인된 유저정보 알려줌
    })
})


// 미들웨어 함수 : 로그인 여부 검사하는 코드 처럼 자주쓰이는 코드를 모듈화
// next는 미들웨어 실행을 끝내고 다음으로 진행할지 여부를 결정하는 파라미터
const checkAuthenticate = (req, res, next) => {

    // if (!req.user) {
    //     // 인증되지 않은 경우
    //     return res.redirect('/auth/login')
    // }

    // 인증된 경우 다음 미들웨어로 진행
    next();
};



// passport.authenticate('local') 쓰면 자동실행 됨
passport.use(new LocalStrategy({
    usernameField: 'email', // req.body.email 사용
    passwordField: 'password' // req.body.password 사용
}, async (email, inputPw, done) => {
    try {
        let result = await db.collection('user').findOne({ email: email });

        if (!result) {
            return done(null, false, { message: "아이디 DB에 없음" });
        }

        if (await bcrypt.compare(inputPw, result.password)) {
            return done(null, result);
        } else {
            return done(null, false, { message: "비번 불일치" });
        }
    } catch (e) {
        console.log("에러 발생:", e);
        return done(e);
    }
}));



app.use('/auth', require('./routes/user.js'))
app.use('/post', require('./routes/post.js'))
app.use('/chat', require('./routes/chat.js'))