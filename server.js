const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const crypto = require("crypto");
const app = express();

app.use(express.static("public"));

const server = http.createServer(app);

const wss = new WebSocket.Server({server});


// 接続中ユーザー
let users = new Map();
let messages = [];
let pinnedMessages = [];
let boardHistory = [];
let boardClients = [];

//ユーザー追加
const accounts = {

    "TSUJIMURA":{
        role:"admin",
        rooms:["room1","room2","room3"]
    },

    "INO":{
        role:"user",
        rooms:["room1"]
    },

    "IGARASHI":{
        role:"user",
        rooms:["room2"]
    }

};

wss.on("connection", (ws) => {

    // 接続ごとにID発行
    const id = crypto.randomUUID();

    boardClients.push(ws);

    users.set(ws, {
        id:id,
        name:"",
        role:"",
        room:""
    });

    ws.send(JSON.stringify({
        type: "id",
        id: id
    }));

    ws.on("message", (message) => {

        const data = JSON.parse(message);
        const user = users.get(ws);

        if(
            data.type === "start" ||
            data.type === "draw"
        ){

            boardHistory.push(data);


            broadcastBoard(
                data.room,
                data
            );

            return;

        }

        if(data.type === "clear"){

            boardHistory =
                boardHistory.filter(
                    item => item.room !== data.room
                );


            broadcastRoom(
                data.room,
                data
            );


            return;

        }

        if(data.type === "boardJoin"){

            ws.boardRoom = data.room;
            ws.clientId = data.clientId;

            boardHistory.forEach((item)=>{


                if(item.room === data.room){

                    ws.send(JSON.stringify(item));

                }


            });


            return;

        }

        // 入室
        if (data.type === "join"){

        if (!accounts[data.name])
        {
            ws.send(JSON.stringify({

                type:"error",
                message:"登録されていないユーザーです"

            }));
            return;
        }

        if (!accounts[data.name].rooms.includes(data.room))
        {

            ws.send(JSON.stringify({

                type:"error",
                message:"この部屋には入室できません"

            }));
            return;
        }

        user.name = data.name;
        user.role = accounts[data.name].role;
        user.room = data.room;

        broadcastRoom(
            user.room,
            {
                type:"system",
                message:user.name + " さんが入室しました"
            }
        );

            messages.forEach((msg)=>{

                if(msg.room === user.room){

                    ws.send(JSON.stringify({

                        ...msg,
                        history:true

                    }));

                }

            });

            sendUserList();

            return;
        }

        if (data.type === "image")
        {
            broadcastRoom(
                user.room,
                {
                    type:"image",
                    id:user.id,
                    name:user.name,
                    image:data.image
                }
            );

            return;
        }

        if (data.type === "typing")
        {

            broadcastRoom(
                user.room,
                {
                    type:"typing",
                    id:user.id,
                    name:user.name,
                    typing:data.typing
                }
            );

            return;
        }

        if (data.type === "read")
        {
            broadcastRoom(
                user.room,
                {
                    type:"read",
                    messageId:data.messageId,
                    user:user.name
                }
            );

            return;
        }

        if (data.type === "pin")
        {
            pinnedMessages.push({
                id: crypto.randomUUID(),
                text:data.text,
                name:user.name
            });

            broadcastRoom(
                user.room,
                {
                    type:"pin",
                    pinnedMessages:pinnedMessages
                }
            );

            return;
        }

        if (data.type === "unpin")
        {
            pinnedMessages = pinnedMessages.filter(msg => msg.id !== data.id);

            broadcastRoom(
                user.room,
                {
                    type:"pin",
                    pinnedMessages:pinnedMessages
                }
            );

            return;
        }

        if (data.type === "reaction")
        {

            broadcastRoom(
                user.room,
                {
                    type:"reaction",
                    messageId:data.messageId,
                    emoji:data.emoji
                }
            );

            return;
        }

        if (data.type === "message")
        {
            const messageData = {

                type:"message",
                messageId: crypto.randomUUID(),
                room:user.room,
                id:user.id,
                name:user.name,
                text:data.text,
                urgent:data.urgent,

                time:new Date().toLocaleTimeString("ja-JP", {
                    timeZone:"Asia/Tokyo",
                    hour:"2-digit",
                    minute:"2-digit"
                })

            };

            // 履歴へ保存
            messages.push(messageData);

            // 直近100件だけ残す
            if (messages.length > 100)
            {
                messages.shift();
            }
            
            broadcastRoom(user.room, messageData);
        }
    });



    ws.on("close", () => {

        const user = users.get(ws);

        if (user && user.name)
        {
            broadcastRoom(
                user.room,
                {
                    type:"system",
                    message:user.name + " さんが退出しました"
                }
            );
        }

        users.delete(ws);
        sendUserList();

    });
});

// 全員へ送信
function broadcastRoom(room, data)
{
    users.forEach((user, client)=>{
        if(user.room === room){
            client.send(JSON.stringify(data));
        }
    });
}

function broadcastBoard(room, data){

    boardClients.forEach((client)=>{

        if(
            client.readyState === WebSocket.OPEN &&
            client.boardRoom === room &&
            client.clientId !== data.clientId
        ){

            client.send(JSON.stringify(data));

        }

    });

}   

// オンライン一覧送信
function sendUserList()
{
    const list = [];

    users.forEach((user)=>{
        if(user.name)
        {
            list.push(user.name);
        }
    });


    users.forEach((user, client)=>{

        if(user.room){

            client.send(JSON.stringify({

                type:"users",
                users:list

            }));

        }

    });

}

server.listen(process.env.PORT || 3000, () => {
    console.log(
        "チャット開始"
    );
});