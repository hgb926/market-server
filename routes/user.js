const router = require("express").Router();
const upload = require("../middlewares/upload");
const { authenticateJWT } = require("../middlewares/auth");
const UserController = require("../controllers/userController");
const db = require("../config/database");

let userController;

db.then((client) => {
    const database = client.db("market");
    userController = new UserController(database);
}).catch((err) => console.error("DB 연결 실패:", err));

router.get("/user", authenticateJWT, (req, res) => userController.getUser(req, res));
router.post("/register", upload.single("image"), (req, res) => userController.register(req, res));
router.post("/send-code", (req, res) => userController.sendCode(req, res));
router.post("/check-nickname", (req, res) => userController.checkNickname(req, res));
router.post("/login", (req, res) => userController.login(req, res));
router.get("/logout", (req, res) => userController.logout(req, res));

module.exports = router;