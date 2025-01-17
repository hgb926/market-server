const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const MongoStore = require("connect-mongo");
const dotenv = require("dotenv").config();
const { createServer } = require("http");

const connectDB = require("./config/database");
const passportConfig = require("./config/passport");
const websocketConfig = require("./config/websocket");
const { formatSendTime } = require("./util/timeFormat");

const app = express();
const server = createServer(app);

// Express 기본 설정
app.use(cookieParser());
app.use(cors({ origin: [process.env.FRONT_URL, process.env.AWS_S3_URL], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session 및 Passport 설정
app.use(
    session({
        secret: process.env.PASSWORD_SECRET_KEY,
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 60 * 60 * 1000 },
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URL,
            dbName: "market",
        }),
    })
);

// DB 연결 후 서버 및 WebSocket 시작
let db;
connectDB
    .then((client) => {
        console.log("DB 연결 성공");
        db = client.db("market");

        const passport = passportConfig(db);
        app.use(passport.initialize());
        app.use(passport.session());

        // 라우터 설정
        app.use("/auth", require("./routes/user"));
        app.use("/post", require("./routes/post"));
        app.use("/chat", require("./routes/chat"));
        app.use("/notice", require("./routes/notice"));

        // WebSocket 설정
        websocketConfig(server, db, formatSendTime);

        // 서버 시작
        server.listen(process.env.PORT || 8080, () => {
            console.log(`서버가 http://localhost:${process.env.PORT || 8080}에서 실행 중`);
        });
    })
    .catch((err) => {
        console.error("DB 연결 실패:", err);
    });