const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { ObjectId } = require('mongodb');
const connectDB = require('./../config/database');
const { formatRelativeTime } = require('./../util/timeFormat');

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

let db;
connectDB
    .then((client) => {
        db = client.db('market');
    })
    .catch((err) => {
        console.error(err);
    });

// S3에 파일 업로드
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

// 게시글 추가
const addPost = async (data, files) => {
    const { title, content, category, price, suggestFlag, writerId, writerInfo, wantPlace, tradeType } = data;

    if (!title || !content) throw new Error('모든 필드를 입력해주세요.');
    if (!files || files.length === 0) throw new Error('이미지를 업로드해주세요.');

    const imageUrls = await Promise.all(files.map(uploadToS3));

    const distanceNum = Math.floor(Math.random() * (8.9 - 0.1), 2) + 0.1;
    const postData = {
        writerId: new ObjectId(writerId),
        writerInfo: JSON.parse(writerInfo),
        title,
        images: imageUrls,
        price: parseInt(price, 10),
        suggestFlag: suggestFlag,
        content,
        wantPlace,
        tradeType,
        status: 'NOT_SORD_YET',
        distance: distanceNum,
        likes: [],
        chats: 0,
        viewCount: 0,
        createdAt: new Date(),
        category,
        isDraft: false
    };

    const result = await db.collection('post').insertOne(postData);
    return { message: '게시글이 성공적으로 등록되었습니다.', postId: result.insertedId };
};

// 게시글 목록 조회
const getPosts = async () => {
    const posts = await db.collection('post').find().toArray();
    posts.reverse().forEach((post) => {
        const diffInMs = new Date() - new Date(post.createdAt);
        post.createdAt = formatRelativeTime(diffInMs);
    });
    return posts;
};

// 게시글 상세 조회
const getPostDetail = async (postId) => {
    const result = await db.collection('post').findOne({ _id: new ObjectId(postId) });
    await db.collection('post').updateOne({ _id: new ObjectId(postId) }, { $inc: { viewCount: 1 } });
    const diffInMs = new Date() - new Date(result.createdAt);
    result.createdAt = formatRelativeTime(diffInMs);
    return result;
};

// 좋아요/좋아요 취소 처리
const handleReaction = async (data) => {
    const { postId, writerId, senderNickname, postImage, postTitle, userId } = data;

    const post = await db.collection('post').findOne({ _id: new ObjectId(postId) });

    const isLiked = await db.collection('notice').findOne({
        writerId: new ObjectId(writerId),
        senderNickname,
        postId: new ObjectId(postId),
    });

    if (!isLiked) {
        await db.collection('notice').insertOne({
            postId: new ObjectId(postId),
            writerId: new ObjectId(writerId),
            postImage,
            postTitle,
            senderNickname,
            createdAt: new Date(),
            type: 'like',
            isClicked: false,
        });
    }

    const userObjectId = new ObjectId(userId);
    if (post.likes.some((like) => like.toString() === userObjectId.toString())) {
        const updatedLikes = post.likes.filter((like) => like.toString() !== userObjectId.toString());
        await db.collection('post').updateOne({ _id: new ObjectId(postId) }, { $set: { likes: updatedLikes } });
        return '취소';
    } else {
        const updatedLikes = [...post.likes, userObjectId];
        await db.collection('post').updateOne({ _id: new ObjectId(postId) }, { $set: { likes: updatedLikes } });
        return '추가';
    }
};

// 게시글 삭제
const deletePost = async (postId) => {
    await db.collection('post').deleteOne({ _id: new ObjectId(postId) });
};

// 좋아요한 게시글 목록 조회
const getLikedPosts = async (userId) => {
    const posts = await db.collection('post').find({ likes: new ObjectId(userId) }).toArray();
    posts.reverse().forEach((post) => {
        const diffInMs = new Date() - new Date(post.createdAt);
        post.createdAt = formatRelativeTime(diffInMs);
    });
    return posts;
};

const searchPosts = async (keyword) => {
    const posts = await db.collection('post')
        .find({title: {$regex: keyword}})
        .toArray();
    posts.reverse().forEach((post) => {
        const diffInMs = new Date() - new Date(post.createdAt);
        post.createdAt = formatRelativeTime(diffInMs);
    });
    return posts;
}

const changeStatus = async (body) => {
    try {
        await db.collection('post').updateOne({ _id: new ObjectId(body.postId) }, { $set: { status: body.status } });
    } catch (e) {
        return null
    }
}

const getSoldLists = async (userId) => {
    const posts = await db.collection('post').find({ writerId: new ObjectId(userId) }).toArray();
    posts.reverse().forEach((post) => {
        const diffInMs = new Date() - new Date(post.createdAt);
        post.createdAt = formatRelativeTime(diffInMs);
    });
    return posts;
}

module.exports = {
    addPost,
    getPosts,
    getPostDetail,
    handleReaction,
    deletePost,
    getLikedPosts,
    searchPosts,
    changeStatus,
    getSoldLists,
};