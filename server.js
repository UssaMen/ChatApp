const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();

app.use(express.static("public"));

const server = http.createServer(app);

const wss = new WebSocket.Server({
    server
});


let users = new Map();


wss.on("connection", (ws) => {


    ws.on("message", (message) => {


        const data = JSON.parse(message);


        // 入室
        if(data.type === "join"){

            users.set(ws, data.name);


            broadcast({
                type: "system",
                message: data.name + " さんが入室しました"
            });

            return;

        }



        // メッセージ送信
        if(data.type === "message"){

            broadcast({
                type: "message",
                name: data.name,
                text: data.text
            });

        }


    });



    ws.on("close", () => {


        const name = users.get(ws);


        if(name){

            broadcast({
                type:"system",
                message:name + " さんが退出しました"
            });


            users.delete(ws);

        }


    });


});




function broadcast(data){

    users.forEach((name, client)=>{

        client.send(JSON.stringify(data));

    });

}



server.listen(3000, () => {

    console.log(
        "チャット開始: http://localhost:3000"
    );

});