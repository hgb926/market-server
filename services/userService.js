const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const { uploadToS3 } = require("../config/s3");
const mailClient = require("../config/mail");
const { makeMailBody } = require("../util/mailForm");

class UserService {
    constructor(db) {
        this.db = db;
    }

    async findUserByEmail(email) {
        return this.db.collection("user").findOne({ email });
    }

    async findUserByNickname(nickname) {
        return this.db.collection("user").findOne({ nickname });
    }

    async findUserById(id) {
        return this.db.collection("user").findOne({ _id: new ObjectId(id) });
    }

    async registerUser(userData, file) {
        const { email, password, nickname, address, zoneCode } = userData;
        const hashedPassword = await bcrypt.hash(password, 10);

        const profileUrl = file
            ? await uploadToS3(file)
            : "https://default-profile-image-url.com/default.jpg";

        return this.db.collection("user").insertOne({
            email,
            password: hashedPassword,
            nickname,
            address,
            zoneCode,
            profileUrl,
        });
    }

    async sendVerificationCode(email) {
        const code = Math.floor(Math.random() * 9000) + 1000;

        await mailClient.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "인증 코드",
            html: makeMailBody(code),
        });

        return code;
    }

    async validatePassword(email, password) {
        const user = await this.findUserByEmail(email);
        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.password);
        return isValid ? user : null;
    }
}

module.exports = UserService;