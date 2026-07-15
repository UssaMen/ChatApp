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


let users = new Map();



wss.on("connection", (ws) => {


    // 接続ごとに一意ID発行
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
                message:data.name + " さんが入室しました"

            });

            sendUserList();  //追加

            return;

        }




        // メッセージ
        if(data.type === "message"){


            broadcast({

                type:"message",
                id:user.id,
                name:user.name,
                text:data.text

            });


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





function broadcast(data){


    users.forEach((user, client)=>{


        client.send(JSON.stringify(data));


    });


}

function sendUserList(){

    const list = [];

    users.forEach((user)=>{

        if(user.name){

            list.push(user.name);

        }

    });


    users.forEach((user, client)=>{

        client.send(JSON.stringify({

            type:"users",
            users:list

        }));

    });

}





server.listen(
    process.env.PORT || 3000,
    () => {

        console.log("server start");

    }
);