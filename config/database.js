const {MongoClient} = require("mongodb");
const env = require('dotenv')
env.config()

const url = process.env.MONGO_URL;
let connectDB = new MongoClient(url).connect();

module.exports = connectDB;