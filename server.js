const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const crypto = require("crypto");

const app = express();

app.use(express.static("public"));

const server = http.createServer(app);

const wss = new WebSocket.Server({
    server
});


// 接続中ユーザー
let users = new Map();
let messages = [];

wss.on("connection", (ws) => {


    // 接続ごとにID発行
    const id = crypto.randomUUID();


    users.set(ws, {
        id: id,
        name: ""
    });



    ws.send(JSON.stringify({
        type: "id",
        id: id
    }));



    ws.on("message", (message) => {


        const data = JSON.parse(message);

        const user = users.get(ws);



        // 入室
        if(data.type === "join"){


            user.name = data.name;


            broadcast({

                type:"system",
                message:user.name + " さんが入室しました"

            });

            messages.forEach((msg)=>{

                ws.send(JSON.stringify(msg));

            }); 


            sendUserList();


            return;

        }

        
        if(data.type === "image"){

            broadcast({

                type:"image",
                id:user.id,
                name:user.name,
                image:data.image

            });

            return;

        }

        if(data.type === "typing"){

            broadcast({

                type:"typing",
                id:user.id,
                name:user.name,
                typing:data.typing

            });

            return;

        }

        if(data.type === "message"){

            const messageData = {

                type:"message",
                id:user.id,
                name:user.name,
                text:data.text,
                time:new Date().toLocaleTimeString("ja-JP", {
                    timeZone: "Asia/Tokyo",
                    hour: "2-digit",
                    minute: "2-digit"
                })

            };


            // 履歴へ保存
            messages.push(messageData);


            // 直近100件だけ残す
            if(messages.length > 100){

                messages.shift();

            }


            broadcast(messageData);


        }


    });



    ws.on("close", () => {


        const user = users.get(ws);


        if(user && user.name){


            broadcast({

                type:"system",
                message:user.name + " さんが退出しました"

            });


        }


        users.delete(ws);


        sendUserList();


    });


});




// 全員へ送信
function broadcast(data){


    users.forEach((user, client)=>{


        client.send(JSON.stringify(data));


    });

}

// オンライン一覧送信
function sendUserList(){


    const list = [];


    users.forEach((user)=>{


        if(user.name){

            list.push(user.name);

        }

    });



    broadcast({

        type:"users",
        users:list

    });

}



server.listen(process.env.PORT || 3000, () => {

    console.log(
        "チャット開始"
    );

});