const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { ObjectId } = require('mongodb');
const connectDB = require('../config/database');
const { formatSendTime, formatRelativeTime } = require('../util/timeFormat');

let db;
let chatGlobalClient = {};
let roomClient = {};
let noticeGlobalClient = {};
let globalChangeStream;
let roomChangeStream;

// 데이터베이스 연결
connectDB.then((client) => {
    db = client.db('market');
    // SSE 초기화
    initializeGlobalSSE();
    initializeRoomSSE();
}).catch((err) => console.error(err));

// S3 업로드
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const uploadToS3 = async (file) => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `uploads/${Date.now()}_${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    const command = new PutObjectCommand(params);
    await s3.send(command);
    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
};

// SSE 글로벌 설정
const initializeGlobalSSE = () => {
    const condition = [{ $match: { operationType: 'insert' } }];
    globalChangeStream = db.collection('chatMsg').watch(condition);
    globalChangeStream.on('change', async (change) => {
        const newMessage = change.fullDocument;
        const payload = await getMessagePayload(newMessage);

        const takerId = newMessage.taker.toString();
        if (chatGlobalClient[takerId]) {
            chatGlobalClient[takerId].write(`data: ${JSON.stringify(payload)}\n\n`);
        }
    });
};

const handleGlobalSSE = (req, res) => {
    const userId = req.query.userId;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    chatGlobalClient[userId] = res;

    req.on('close', () => {
        delete chatGlobalClient[userId];
    });
};

// SSE 룸 설정
const initializeRoomSSE = () => {
    const condition = [{ $match: { operationType: 'insert' } }];
    roomChangeStream = db.collection('chatRoom').watch(condition);
    roomChangeStream.on('change', (change) => {
        const newRoom = change.fullDocument;
        const payload = {
            roomId: newRoom._id,
            customerInfo: newRoom.customerInfo,
            sellerInfo: newRoom.sellerInfo,
            postInfo: newRoom.postInfo,
            createdAt: newRoom.date,
        };

        Object.keys(roomClient).forEach((userId) => {
            roomClient[userId].write(`data: ${JSON.stringify(payload)}\n\n`);
        });
    });
};

const handleRoomSSE = (req, res) => {
    const userId = req.query.userId;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    roomClient[userId] = res;

    req.on('close', () => {
        delete roomClient[userId];
    });
};

const handlePostStatusSSE = (req, res) => {
    const userId = req.query.userId;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // 클라이언트 객체 저장
    noticeGlobalClient[userId] = res;

    // MongoDB 변경 사항 감지
    const changeStream = db.collection('post').watch([{ $match: { operationType: 'update' } }], {
        fullDocument: 'updateLookup',
    });

    changeStream.on('change', (change) => {
        res.write(`data: ${JSON.stringify(change.fullDocument.status)}\n\n`);
    });

    req.on('close', () => {
        console.log(`User ${userId} disconnected.`);
        delete noticeGlobalClient[userId];
        changeStream.close(); // 스트림 닫기
    });
};


// 채팅방 생성
const createChatRoom = async (data) => {
    const existingRoom = await db.collection('chatRoom').findOne({
        'customerInfo.customerId': new ObjectId(data.customerInfo.customerId),
        'sellerInfo.sellerId': new ObjectId(data.sellerInfo.sellerId),
        'postInfo.postId': new ObjectId(data.postInfo.postId),
    });

    if (existingRoom) {
        return { chatId: existingRoom._id };
    }

    const result = await db.collection('chatRoom').insertOne({
        customerInfo: {
            ...data.customerInfo,
            customerId: new ObjectId(data.customerInfo.customerId),
        },
        sellerInfo: {
            ...data.sellerInfo,
            sellerId: new ObjectId(data.sellerInfo.sellerId),
        },
        postInfo: {
            ...data.postInfo,
            postId: new ObjectId(data.postInfo.postId),
        },
        date: new Date(),
        lastMsg: '',
        lastChatTime: new Date(),
    });

    await db.collection('post').updateOne(
        { _id: new ObjectId(data.postInfo.postId) },
        { $inc: { chats: 1 } }
    );

    return { chatId: result.insertedId };
};

// 메시지 정보 가져오기
const getMessagePayload = async (message) => {
    const user = await db.collection('user').findOne({ _id: new ObjectId(message.writer) });
    const room = await db.collection('chatRoom').findOne({ _id: new ObjectId(message.room) });

    return {
        ...message,
        nickname: user.nickname,
        postTitle: room.postInfo.postTitle,
        profileUrl: user.profileUrl,
    };
};

// 채팅 상세 조회
const getChatDetails = async (roomId) => {
    const messages = await db.collection('chatMsg').find({ room: new ObjectId(roomId) }).toArray();
    messages.forEach((msg) => {
        msg.formatTime = formatSendTime(msg.date);
    });
    return messages;
};

// 채팅방 정보 조회
const getChatRoomInfo = async (roomId) => {
    return await db.collection('chatRoom').findOne({ _id: new ObjectId(roomId) });
};

// 유저 채팅 리스트 조회
const getUserChatList = async (userId) => {
    const chatRooms = await db.collection('chatRoom').find({
        $or: [
            { 'customerInfo.customerId': new ObjectId(userId) },
            { 'sellerInfo.sellerId': new ObjectId(userId) },
        ],
    }).toArray();

    chatRooms.forEach((room) => {
        if (room.lastChatTime) {
            const diffInMs = new Date() - new Date(room.lastChatTime);
            room.relativeTime = formatRelativeTime(diffInMs);
        }
    });

    return chatRooms;
};

// 채팅방 삭제
const deleteChatRoom = async (roomId) => {
    await db.collection('chatRoom').deleteOne({ _id: new ObjectId(roomId) });
    await db.collection('chatMsg').deleteMany({ room: new ObjectId(roomId) });
};

const getBuyChatList = async (id) => {
    const chatRooms = await db.collection('chatRoom').find(
            { 'customerInfo.customerId': new ObjectId(id) }
    ).toArray();

    chatRooms.forEach((room) => {
        if (room.lastChatTime) {
            const diffInMs = new Date() - new Date(room.lastChatTime);
            room.relativeTime = formatRelativeTime(diffInMs);
        }
    });

    return chatRooms;
}

const getSellChatList = async (id) => {
    const chatRooms = await db.collection('chatRoom').find(
        { 'sellerInfo.sellerId': new ObjectId(id) }
    ).toArray();

    chatRooms.forEach((room) => {
        if (room.lastChatTime) {
            const diffInMs = new Date() - new Date(room.lastChatTime);
            room.relativeTime = formatRelativeTime(diffInMs);
        }
    });

    return chatRooms;
}

module.exports = {
    handleGlobalSSE,
    handleRoomSSE,
    handlePostStatusSSE,
    createChatRoom,
    getChatDetails,
    getChatRoomInfo,
    getUserChatList,
    deleteChatRoom,
    getBuyChatList,
    getSellChatList,
};