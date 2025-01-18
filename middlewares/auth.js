const { verifyToken } = require("../config/jwt");

function authenticateJWT(req, res, next) {
    const token = req.cookies.authToken; // 쿠키에서 토큰 가져오기
    if (!token) {
        return res.status(401).json({ message: "인증 토큰 없음" });
    }

    try {
        req.user = verifyToken(token); // 유효한 토큰인지 확인
        next();
    } catch (error) {
        return res.status(403).json({ message: "유효하지 않은 토큰" });
    }
}

module.exports = { authenticateJWT };