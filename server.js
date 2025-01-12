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
const {formatSendTime} = require("./util/timeFormat");

// WebSocket 서버 설정
const server = createServer(app);
const wss = new WebSocketServer({ server });

// 방 데이터를 저장할 객체
const rooms = {};

// WebSocket 연결 이벤트
wss.on("connection", (ws) => {
    console.log("WebSocket 연결됨");

    // 클라이언트가 특정 방에 참여 요청
    ws.on("message", async (message) => {
        const data = JSON.parse(message);

        if (data.event === "joinRoom") {
            // 클라이언트를 특정 방에 추가
            const room = data.room;
            if (!rooms[room]) {
                rooms[room] = new Set();
            }
            rooms[room].add(ws);
            ws.room = room; // WebSocket 객체에 방 정보 저장

        }

        if (data.event === "sendMessage") {


            // 메시지 저장 (MongoDB 예제)
            await db.collection("chatMsg").insertOne({
                room: new ObjectId(data.room),
                text: data.text,
                writer: new ObjectId(data.writer),
                date: new Date(),
            });

            await db.collection('chatRoom').updateOne(
                {_id: new ObjectId(data.room)},
                {$set: {
                        lastChatTime : new Date(),
                        lastMsg : data.text
                    }},
            )

            // 방에 있는 모든 클라이언트에 메시지 전송
            const room = rooms[data.room];
            if (room) {
                room.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(
                            JSON.stringify({
                                event: "serverToClient",
                                room: data.room,
                                text: data.text,
                                writer: data.writer,
                                date: new Date(),
                                formatTime: formatSendTime(new Date())
                            })
                        );
                    }
                });
            }
        }
    });

    // 클라이언트 연결 해제 시 방에서 제거
    ws.on("close", () => {
        const room = ws.room;
        if (room && rooms[room]) {
            rooms[room].delete(ws);
            if (rooms[room].size === 0) {
                delete rooms[room]; // 방이 비었으면 삭제
            }
        }
        console.log("클라이언트 연결 종료");
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