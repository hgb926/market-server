const express = require('express');
const app = express()
const { MongoClient } = require('mongodb');
const env = require('dotenv')
const connectDB = require('./config/database.js');
env.config()

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