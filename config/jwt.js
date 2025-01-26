const jwt = require("jsonwebtoken");

function generateToken(payload, expiresIn = "1d") {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        throw new Error("유효하지 않은 토큰");
    }
}

module.exports = { generateToken, verifyToken };