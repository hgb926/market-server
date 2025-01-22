const { WebSocketServer } = require("ws");
const { ObjectId } = require("mongodb");

module.exports = (server, db, formatSendTime) => {
    const wss = new WebSocketServer({ server });
    const rooms = {}; // 방 데이터를 저장할 객체

    wss.on("connection", (ws) => {
        console.log("WebSocket 연결됨");

        ws.on("message", async (message) => {
            const data = JSON.parse(message);

            if (data.event === "joinRoom") {
                const room = data.room;
                if (!rooms[room]) rooms[room] = new Set();
                rooms[room].add(ws);
                ws.room = room; // WebSocket 객체에 방 정보 저장
            }

            if (data.event === "sendMessage") {
                console.log(data)
                await db.collection("chatMsg").insertOne({
                    room: new ObjectId(data.room),
                    text: data.text || '',
                    imageUrl: data.imageUrl || '',
                    writer: new ObjectId(data.writer),
                    date: new Date(),
                    taker: new ObjectId(data.taker),
                });

                await db.collection("chatRoom").updateOne(
                    { _id: new ObjectId(data.room) },
                    {
                        $set: {
                            lastChatTime: new Date(),
                            lastMsg: data.text,
                        },
                    }
                );

                const room = rooms[data.room];
                if (room) {
                    room.forEach((client) => {
                        if (client.readyState === ws.OPEN) {
                            client.send(
                                JSON.stringify({
                                    event: "serverToClient",
                                    room: data.room,
                                    text: data.text,
                                    writer: data.writer,
                                    date: new Date(),
                                    formatTime: formatSendTime(new Date()),
                                })
                            );
                        }
                    });
                }
            }
        });

        ws.on("close", () => {
            const room = ws.room;
            if (room && rooms[room]) {
                rooms[room].delete(ws);
                if (rooms[room].size === 0) delete rooms[room];
            }
            console.log("클라이언트 연결 종료");
        });
    });

    return wss;
};