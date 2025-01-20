const {ObjectId} = require('mongodb');
const connectDB = require('./../config/database');
const {formatMonthAndDay} = require('./../util/timeFormat');

let db;
connectDB
    .then((client) => {
        db = client.db('market');
    })
    .catch((err) => {
        console.error(err);
    });

const addHistory = async (data) => {
    if (!data.word || !data.userId) throw new Error('모든 필드를 입력해주세요.')
    const flag = await db.collection('searchHistory').find({
        keyword: data.word,
    });
    if (flag) {
        return {message: '이미 등록되어있습니다.'}
    } else {
        const payload = {
            userId: new ObjectId(data.userId),
            keyword: data.word,
            createdAt: new Date(),
        }
        const result = await db.collection('searchHistory').insertOne(payload);
        return {message: '기록 등록 완료'}
    }
}

const getHistories = async (userId) => {
    if (!userId) throw new Error('id가 없습니다.')
    const result = await db.collection('searchHistory').find({
        userId: new ObjectId(userId)
    }).toArray();
    result.reverse().forEach((history) => {
        history.createdAt = formatMonthAndDay(history.createdAt);
    });
    return result
}

const deleteHistory = async (id) => {
    return await db.collection('searchHistory').deleteOne({ _id: new ObjectId(id) });
}

const deleteHistories = async (id) => {
    console.log(id)
    return await db.collection('searchHistory').deleteMany({
        userId: new ObjectId(id),
    })
}



module.exports = {
    addHistory,
    getHistories,
    deleteHistory,
    deleteHistories
}