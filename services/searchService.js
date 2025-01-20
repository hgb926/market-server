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





module.exports = {
    // addPost,
}