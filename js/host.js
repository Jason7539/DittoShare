var socket = io.connect();

// Grab elements needed from html
const videoElem = document.getElementById("video");

const startElem = document.getElementById("start");
const stopElem = document.getElementById("stop");
const callElem = document.getElementById("call");
const hangupElem = document.getElementById("hangup");

const logElem = document.getElementById("log");

let localPeerConnection;
let localStream;

const servers = null;

// Disable appropriate buttons on start 
stopElem.disabled = true;
callElem.disabled = true;
hangupElem.disabled = true;

// Options for getDisplayMedia()
var displayMediaOptions = {
    video: {
      cursor: "never"
    },
    audio: true
};

// Set event listeners for the start, stop, call, and hangup buttons
startElem.addEventListener("click", function(evt) {
    startCapture();
  }, false);
  
  stopElem.addEventListener("click", function(evt) {
    stopCapture();
  }, false);
  
  callElem.addEventListener("click", function(evt) {
    call();
  }, false);
  
  hangupElem.addEventListener("click", function(evt) {
    hangup();
  }, false);

// add client SDP when ready
socket.on("getClientSDP", function(answer){
  localPeerConnection.setRemoteDescription(answer);
});


// add client Ice candidate when it's done 
socket.on("ClientIceDone", function(clientCandidates){
  var i;
  for(i = 0; i < clientCandidates.length; i++){
    clientIce = new RTCIceCandidate(clientCandidates[i])
    // alert("inserted: " + JSON.stringify(clientIce));
    localPeerConnection.addIceCandidate(clientIce);
  }
  localPeerConnection.addStream(localStream);
});

async function startCapture() {
    try {
        // create new RTCpeerconnection and add stream
        // exchange network info / ice candidates 
        // get and share local and remote description

        localStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
        
        // start streaming localVideo 
        videoElem.srcObject = localStream;

        startElem.disabled = true;
        callElem.disabled = false;

    } catch(err) {
        console.error("Error: " + err);
    }
}

/**
 * Stop the local video from streaming
 */
async function stopCapture() {
    let tracks = videoElem.srcObject.getTracks();

    tracks.forEach(track => track.stop());
    videoElem.srcObject = null; 
}

/**
 * Begin the exchange from host to client 
 */
async function call() {
    callElem.disabled = true;
    hangupElem.disabled = false;

  // Create local peer connection
  localPeerConnection = new RTCPeerConnection(servers);
  // create handler for exchanging icecandidates
  localPeerConnection.addEventListener('icecandidate', handleConnectionLocal);

  // add the stream 
  localPeerConnection.addStream(localStream);

  // offer options for SDP
  const offerOptions = {
    offerToReceiveVideo: 1,
  };

  // begin exchange SDP 
  localPeerConnection.createOffer(offerOptions)
  .then(createdOffer).catch(setSessionDescriptionError);

}

function handleConnectionLocal(event) {
  // send local icecandidate to remote 
  const icecandidate = event.candidate;
  const newIceCandidate = new RTCIceCandidate(icecandidate); 
  // send Icecandidate to the server 
  socket.emit("recieveHostCandidate", icecandidate);

  // remote adds local's ice candidate
  // TODO: DELETE
  // if(icecandidate) {
  //   remotePeerConnection.addIceCandidate(icecandidate);
  // }
}

function createdOffer(description) {
  // local: setLocal, remote: setRemote
  localPeerConnection.setLocalDescription(description);

  socket.emit("recieveHostSDP", description);

  // remotePeerConnection.setRemoteDescription(description);

  // remote: setLocal, local: setRemote

  // offer options for SDP
  const offerOptions = {
    offerToReceiveVideo: 1,

  };

  // TODO: DELETE, and add socket on for event answer 
}

setInterval(pollIce, 1000);

function pollIce(){
  logElem.innerHTML = localPeerConnection.iceGatheringState;
  logElem.innerHTML += "\r state: " + localPeerConnection.connectionState;
  logElem.innerHTML += "\r remoteDes: " + localPeerConnection.remoteDescription;

  // when iceCandidates are done. send a flag to server.
  if(localPeerConnection.iceGatheringState == "complete"){
    // tell the server that hosts is done gathering candidates 
    socket.emit("hostIceDone", "Host IS Done");  
  }
}


function setSessionDescriptionError(error) {
  console.log("ERROR" + error);
}
