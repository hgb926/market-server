const multer = require("multer");

// 메모리 스토리지 설정
const storage = multer.memoryStorage();

const upload = multer({ storage });

module.exports = upload;