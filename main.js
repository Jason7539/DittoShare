var express = require('express');
var app = express();
var path = require('path');
var ip = require("ip");
var fs = require("fs");
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


var hostClientPoll = setInterval(pollHostClient, 3000); 


// handle user room mangement
io.on('connection', function (socket) { 
    console.log("someone has Entered");

    // create new room and store name and capacity 
    socket.on('createRoom', function(data){
        console.log("new room:" + data['newRoomName']);

        // Add the room to our dictionary 
        roomDict[data['newRoomName']] = 1;
        console.log("the new Dict: " + JSON.stringify(roomDict));
    });

    socket.on("host", function(){
        console.log("you join host");
    });

    // store hosts candidate information
    socket.on("recieveHostCandidate", function(data){
        hostIceCandidates.push(data);
        console.log("Host candidates: "+ JSON.stringify(data));
    });

    //stores client candidate information
    // on recieve send client candidate to host. and host candidate to client
    socket.on("recieveClientCandidate", function(data){
        clientIceCandidates.push(data);
        console.log("Client candidates: " + JSON.stringify(data));

    });

    // store hosts SDP information
    socket.on("recieveHostSDP", function(data){
        hostSDP.push(data);
        console.log("HOSTS SDP: " + JSON.stringify(hostSDP));
    });

    // send host SDP when client is ready for it 
    socket.on("askHostSDP", function(data){
        socket.emit("getHostSDP", hostSDP[0]);   
        // console.log("HOST SDP: " + JSON.stringify(hostSDP[0])) 
    });

    // send client SDP to host when ready
    socket.on("clientSDPReady", function(answer){
        io.emit("getClientSDP", answer);
        // console.log("CLIENT SDP: " + JSON.stringify(answer));
    });

    // flag host ice as ready
    socket.on("hostIceDone", function(data){
        isHostIceReady = true;
    });

    // flag client ice as ready 
    socket.on("clientIceDone", function(data){
        isClientIceReady = true;
    });






    socket.on("clientTest", function(data){
        console.log("testing successful");
    })



    // socket.on('joinRoom');




    
    // if(userNum == 0 ){
    //     userNum += 1;
    //     console.log("This user is host")

    // }
    // else if(userNum == 1){
    //     userNum += 1;
    //     console.log("user is now 2");
    // }
    // else{
    //     console.log("full");
    // }
  });

// when host and clients ice candidates are ready exchange both
// When a new client joins is clientIceReady = false
function pollHostClient() {
    if(isHostIceReady && isClientIceReady){
        console.log("THE HOST AND CLIENT ARE READY ");
        clearInterval(hostClientPoll);

        io.emit("HostIceDone", hostIceCandidates);
        io.emit("ClientIceDone", clientIceCandidates);

    }
}