var express = require('express');
var app = express();
var path = require('path');
var ip = require("ip");
var fs = require("fs");
var uniqid = require('uniqid');
var socketIO = require('socket.io');
const server = require('https').createServer({
    key: fs.readFileSync('./ca/server.key'),
    cert: fs.readFileSync('./ca/server.cert')
} ,app);
const io = require('socket.io')(server);

// get the server local ip
const hostIp = ip.address();

// serve static files 
// app.use(express.static('./'))
app.use('/html', express.static('html'))
app.use('/js', express.static('js'))
app.use('/', express.static('./'));


// handle request for root 
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

// starting the server 
// serverObj = app.listen(3000);
// server.listen(3000, hostIp);
server.listen(3000, hostIp);
console.log("server started: https://" + hostIp + ":3000");

var roomCapacity = 2;

// Dictionary of room name and capacity
var roomDict = {};

// Dictionary of rooms of ready status of host and client candidates 
var iceReadyDict = {};

// array holding hosts icecandidate
var hostIceCandidates = [];

// array holding hosts icecandidate
var clientIceCandidates = [];

// array holding hosts SPD information
var hostSDP = [];

var isHostIceReady = false;
var isClientIceReady = false;

// array hold all information associated with rooms 
var rooms = [];

//** */
// var hostClientPoll = setInterval(pollHostClient, 3000); 


// handle user room mangement
io.on('connection', function (socket) { 
    console.log("someone has Entered");

    // Check if room exists so client can join
    socket.on("joinRoom", function(data){
        for(i = 0; i < rooms.length; i++){
            if(rooms[i].roomName == data.roomName){
                // Allow client to join and give him a uniqID
                socket.emit("joinPass", {"id":uniqid()});
                return;
            }
        }
        socket.emit("joinFail");
    });

    // create new room and store name and capacity 
    socket.on('createRoom', function(data){
        console.log("trying to create new room:" + data['newRoomName']);

        var roomExists = false;
        // check if room name exists 
        for(i = 0; i < rooms.length; i++){
            if(rooms[i].roomName == data['newRoomName']){

                // If name exists tell hosts create room failed.
                socket.emit("failedNameExists");
                roomExists = true;
                console.log("room create failed")
            }
        }
        // If the room doesn't exists create it 
        if(!roomExists){
            console.log("created room: " + data['newRoomName']);
            rooms.push({
                roomName: data['newRoomName'],
                hostSDP: [],
                hostCandidates: [],
                clientIceCandidates: [],  // contains {id: int, candidates: []}
                clientSDP: [],
                isHostIceReady: false
            });
            // tell host to create new room was successful
            socket.emit("createSuccess");
        }

    });

    socket.on("host", function(){
        console.log("you join host");
    });

    // store hosts candidate information
    socket.on("recieveHostCandidate", function(data){
        // hostIceCandidates.push(data);
        hostIceCandidates.push(data["ice"]);

        // place host ice based on roomName 
        for(i = 0; i < rooms.length; i++){
            if(data["roomName"] == rooms[i].roomName){
                rooms[i].hostCandidates.push(data["ice"]);
            }
        }
        console.log("Host candidates: "+ JSON.stringify(data["ice"]));
    });

    //stores client candidate information
    // on recieve send client candidate to host. and host candidate to client
    socket.on("recieveClientCandidate", function(data){
        clientIceCandidates.push(data.clientIce);

        for(i = 0; i < rooms.length; i++){
            if(data.roomName == rooms[i].roomName){

                // check if client Ice exists

                // Check if uniqId in there already.
                var idExists = false;
                for(j = 0; j < rooms[i].clientIceCandidates.length; j++){
                    if(rooms[i].clientIceCandidates[j].id == data.id){
                        console.log("WE GOT ID MATCH: ");
                        idExists = true;

                        rooms[i].clientIceCandidates[j].Ice.push(data.clientIce);
                        return;
                    }
                }

                // This is the first id insert in client Ice
                console.log("PLACING IN NEW Ice FIRST TIME");
                rooms[i].clientIceCandidates.push({"id":data.id, "Ice": []});
                return;
            }
        }
        console.log("Client candidates: " + JSON.stringify(data.clientSDP));
    });

    // store hosts SDP information
    socket.on("recieveHostSDP", function(data){
        hostSDP.push(data["hostSDP"]);

        // place host sdp based on roomName 
        for(i = 0; i < rooms.length; i++){
            if(data["roomName"] == rooms[i].roomName){
                rooms[i].hostSDP.push(data["hostSDP"]);
            }
        }
        console.log("HOSTS SDP: " + JSON.stringify(data["hostSDP"]));
    });

    // send host SDP when client is ready for it 
    socket.on("askHostSDP", function(data){
        // socket.emit("getHostSDP", hostSDP[0]);

        for(i = 0; i < rooms.length; i++){
            if(data.roomName == rooms[i].roomName){
                socket.emit("getHostSDP", rooms[i].hostSDP[0]);   
            }
        }

   
    });


    // START OFF HERE
    // send client SDP to host when ready
    socket.on("clientSDPReady", function(data){
        io.emit(data.roomName, data.answer);
        // io.emit("getClientSDP", data.answer);
    });

    // flag host ice as ready
    socket.on("hostIceDone", function(data){
        // get room name from data
        // find the room.
        for(i = 0; i < rooms.length; i++){
            if(data.roomName == rooms[i].roomName){
                // got the room name
                rooms[i].isHostIceReady = true;
            }
        }
        isHostIceReady = true;
    });

    // flag client ice as ready 
    socket.on("clientIceDone", function(data){

        console.log("INSIDE CLIENT DONE PING");        
        var roomNum = 0;
        for(i = 0; i < rooms.length; i++){
            if(data.roomName == rooms[i].roomName){
                // got the room name
                roomNum = i;
                io.emit(data.roomName+ "-" + "HostIceDone", rooms[i].hostCandidates);
                break;
                // find ID of client thats the ice we send

                
                // io.to(data.roomName).emit("HostIceDone", rooms[i].hostCandidates);
                // io.to(data.roomName).emit("ClientIceDone", rooms[i].clientIceCandidates);

            }
        }
        for(j =0; j < rooms[roomNum].clientIceCandidates.length; j++){
            //find the uiq id
            // send the rest 
            if(data.id == rooms[roomNum].clientIceCandidates[j].id){
                io.emit(data.roomName+ "-" + "ClientIceDone", rooms[roomNum].clientIceCandidates[j].Ice);
            }
        }
        isClientIceReady = true; 
    });

    socket.on("clientTest", function(data){
        console.log("testing successful");
    })



    // socket.on('joinRoom');

  });


/** */
// when host and clients ice candidates are ready exchange both
// When a new client joins is clientIceReady = false
// function pollHostClient() {
//     if(isHostIceReady && isClientIceReady){
//         console.log("THE HOST AND CLIENT ARE READY ");
//         clearInterval(hostClientPoll);
        
        

//         // io.emit("HostIceDone", hostIceCandidates);
//         // io.emit("ClientIceDone", clientIceCandidates);

//     }
// }

