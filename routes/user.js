const router = require('express').Router();

const connectDB = require('./../config/database')
const passport = require("passport");
const bcrypt = require("bcrypt");

let db;
connectDB.then((client) => {
    db = client.db("forum")
}).catch((err) => {
    console.log(err)
})


router.get('/send-code', (req, res) => {
    const code = Math.floor(Math.random() * 9000) + 1000;
    res.send(code.toString()); // 문자열로 변환
});

router.post('/register', async (req, res) => {
    const hashed = await bcrypt.hash(req.body.password, 10);

    let result = await db.collection('user').insertOne({
        username: req.body.username,
        password: hashed
    });
    res.send(result)
})

module.exports = router;