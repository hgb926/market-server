const UserService = require("../services/userService");
const { generateToken } = require("../config/jwt");

class UserController {
    constructor(db) {
        this.userService = new UserService(db);
    }

    async getUser(req, res) {
        try {
            const user = await this.userService.findUserById(req.user.id);
            if (!user) return res.status(400).json("사용자 정보를 찾을 수 없습니다.");

            const { _id, email, nickname, address, zoneCode, profileUrl } = user;
            res.status(200).json({ id: _id, email, nickname, address, zoneCode, profileUrl });
        } catch (error) {
            res.status(500).json("서버 오류");
        }
    }

    async register(req, res) {
        try {
            const result = await this.userService.registerUser(req.body, req.file);
            res.status(200).json({ message: "회원가입 성공", data: result });
        } catch (error) {
            res.status(500).json("회원가입 실패");
        }
    }

    async sendCode(req, res) {
        try {
            const code = await this.userService.sendVerificationCode(req.body.email);
            res.status(200).json(code);
        } catch (error) {
            res.status(400).json( "코드 전송 실패");
        }
    }

    async checkNickname(req, res) {
        try {
            const user = await this.userService.findUserByNickname(req.body.nickname);
            if (user) {
                return res.status(400).json("중복되는 닉네임입니다.");
            }
            res.status(200).send("사용 가능한 닉네임입니다!");
        } catch (error) {
            res.status(500).json("서버 오류");
        }
    }

    async login(req, res) {
        try {
            const { email, password, autoLogin } = req.body;
            const user = await this.userService.validatePassword(email, password);
            if (!user) return res.status(400).json("이메일 또는 비밀번호가 일치하지 않습니다.");

            const expiresIn = autoLogin ? "30d" : "1d";
            const token = generateToken({ id: user._id, email: user.email }, expiresIn);

            res.cookie("authToken", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: autoLogin ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
            });

            res.status(200).json({ user });
        } catch (error) {
            res.status(500).json( "로그인 실패");
        }
    }

    async logout(req, res) {
        res.clearCookie("authToken", { path: "/" });
        res.status(200).json({ message: "로그아웃 성공" });
    }
}

module.exports = UserController;