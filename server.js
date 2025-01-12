const express = require('express');
const app = express();
const { ObjectId } = require('mongodb');
const dotenv = require('dotenv').config();
const connectDB = require('./config/database.js');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');

// WebSocket 서버 설정
const server = createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket 연결 이벤트
wss.on('connection', (ws) => {
    console.log("WebSocket 연결됨");

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data) {
            console.log("수신된 메시지:", data);

            // 연결된 모든 클라이언트에 메시지 브로드캐스트
            wss.clients.forEach((client) => {
                if (client.readyState === ws.OPEN) {
                    client.send(JSON.stringify({ event: 'serverToClient', message: `${data.text}` }));
                }
            });
        }
    });
});
// Express 앱 설정
app.use(cookieParser());
app.use(cors({
    origin: [process.env.FRONT_URL, process.env.AWS_S3_URL],
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: '암호화 비번',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 },
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URL,
        dbName: 'market',
    }),
}));
app.use(passport.initialize());
app.use(passport.session());

// Passport 설정
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
}, async (email, password, done) => {
    try {
        const user = await db.collection('user').findOne({ email });
        if (!user) return done(null, false, { message: '아이디 DB에 없음' });

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) return done(null, false, { message: '비번 불일치' });

        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));

passport.serializeUser((user, done) => {
    done(null, { id: user._id, username: user.nickname });
});

passport.deserializeUser(async (user, done) => {
    const result = await db.collection('user').findOne({ _id: new ObjectId(user.id) });
    delete result.password;
    done(null, result);
});

// 라우터 설정
app.use('/auth', require('./routes/user.js'));
app.use('/post', require('./routes/post.js'));
app.use('/chat', require('./routes/chat.js'));

// DB 연결 후 서버 시작
let db;
connectDB.then((client) => {
    console.log("DB연결 성공");
    db = client.db("market");

    // 서버 시작
    server.listen(process.env.PORT || 8080, () => {
        console.log(`서버가 http://localhost:${process.env.PORT || 8080}에서 실행 중`);
    });
}).catch((err) => {
    console.error("DB 연결 실패:", err);
});