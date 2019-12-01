var socket = io.connect();
// socket.join(sessionStorage.getItem("roomName"));


const remoteVideoElem = document.getElementById("remoteVideo");
const startCapturenElem = document.getElementById("startCapture");
const logElem = document.getElementById("status");

// set even listener for startCapture button 
startCapturenElem.addEventListener("click", function(evt){
    startCapture();
}, false);


let remotePeerConnection;

let localStream;
let remoteStream;
let mediaStream;

// add HostSDP when its ready 
socket.on("getHostSDP", function(data){
    remotePeerConnection.setRemoteDescription(data);
    
    // offer options for SDP
    const offerOptions = {
        offerToReceiveVideo: 1,
    };

    // create answer for the host 
    remotePeerConnection.createAnswer(offerOptions).then(function(answer){
        remotePeerConnection.setLocalDescription(answer);



        // STAR OFF HERE
        // socket.emit("clientSDPReady", answer);
        socket.emit("clientSDPReady", {"roomName": sessionStorage.getItem("roomName"), 
        "answer":answer})
    });
});

// add host Ice candidate when it's ready
socket.on(sessionStorage.getItem("roomName") + "-" +"HostIceDone", function(hostCandidates){
    prompt("READING ROOM MESSAGE");
    var i;
    for(i = 0; i < hostCandidates.length; i++){
        // alert(JSON.stringify(hostCandidates[i]));
        hostIce = new RTCIceCandidate(hostCandidates[i])
        // alert("NewIce: " +JSON.stringify(hostIce) );

        remotePeerConnection.addIceCandidate(hostIce);
    }
    // alert(JSON.stringify(hostCandidates));
});



/**
 * begin the exchange between client and host
 */
function startCapture(){
    socket.emit("clientTest", "hello");

    const servers = null;

    // create peer connection
    remotePeerConnection = new RTCPeerConnection(servers);

    // create handler for exchanging icecandidates
    remotePeerConnection.addEventListener('icecandidate', handleConnectionRemote)

    // handle when local peer adds stream
    remotePeerConnection.addEventListener('addstream', gotRemoteMediaStream);

    // TODO: add the local SDP to remote and creata answer
    // ask for host SDP 
    socket.emit("askHostSDP", {"roomName":sessionStorage.getItem("roomName")});
}


/**
 * start streaming video after local peer adds it to stream 
 * @param {*} event object of the video to be streamed
 */
function gotRemoteMediaStream(event) {
    const mediaStream = event.stream;
    remoteVideoElem.srcObject = mediaStream;
    remoteStream = mediaStream;
}

function handleConnectionRemote(event) {
    // send remote icecandidate to local
    const icecandidate = event.candidate;
    const newIceCandidate =  new RTCIceCandidate(icecandidate);
    
    socket.emit("recieveClientCandidate", {"clientIce":icecandidate, 
    "roomName": sessionStorage.getItem("roomName"),
    "id": sessionStorage.getItem("id")});
}

var poll = setInterval(pollIce, 1000);

function pollIce(){
    logElem.innerHTML = remotePeerConnection.iceGatheringState;
    logElem.innerHTML += "\r connectionState: " + remotePeerConnection.connectionState;
    logElem.innerHTML += "\r remoteDes: " + remotePeerConnection.remoteDescription;

    
    // when iceCandidates are done. send a flag to server.
    if(remotePeerConnection.iceGatheringState == "complete"){
        // tell the server that hosts is done gathering candidates 
        socket.emit("clientIceDone", {"roomName":sessionStorage.getItem("roomName"), "id":sessionStorage.getItem("id")});  
        clearInterval(poll);
    }
}
