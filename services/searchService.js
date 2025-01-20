const { ObjectId } = require('mongodb');
const connectDB = require('./../config/database');
const { formatRelativeTime } = require('./../util/timeFormat');

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
    const payload = {
        userId: new ObjectId(data.userId),
        keyword: data.word,
        createdAt: new Date(),
    }
    const result = await db.collection('searchHistory').insertOne(payload);
    return { message: '기록 등록 완료' }
}

const getHistories = async (userId) => {
    if (!userId) throw new Error('id가 없습니다.')
    const result = await db.collection('searchHistory').find({
        userId: new ObjectId(userId)
    }).toArray();
    result.reverse().forEach((history) => {
        const diffInMs = new Date() - new Date(history.createdAt);
        history.createdAt = formatRelativeTime(diffInMs);
    });
    return result

}



module.exports = {
    addHistory,
    getHistories,
}