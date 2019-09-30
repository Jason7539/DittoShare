// grab needed elements from html
const videoElem = document.getElementById("video");
const remoteVideoElem = document.getElementById("remoteVideo");

const logElem = document.getElementById("log");
const startElem = document.getElementById("start");
const stopElem = document.getElementById("stop");
const callElem = document.getElementById("call");
const hangupElem = document.getElementById("hangup");

let localPeerConnection;
let remotePeerConnection;

let localStream;
let remoteStream;

const servers = null;

// disable appropriate buttons on start
callElem.disabled = true;
hangupElem.disabled = true;

// Options for getDisplayMedia()
var displayMediaOptions = {
  video: {
    cursor: "never"
  },
  audio: true
};


// Set event listeners for the start, stop, call, hangup buttons
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

// log initial message
console.log = msg => logElem.innerHTML += `${msg}<br>`;
console.error = msg => logElem.innerHTML += `<span class="error">${msg}</span><br>`;
console.warn = msg => logElem.innerHTML += `<span class="warn">${msg}<span><br>`;
console.info = msg => logElem.innerHTML += `<span class="info">${msg}</span><br>`;

/**
 * 
 */
async function startCapture() {
  logElem.innerHTML = "starting .. \n";

  try {
    // create new RTCpeerconnection and add stream
    // exchange network info / ice candidates 
    // get and share local and remote description

    localStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
    
    // start streaming localVideo 
    videoElem.srcObject = localStream;

    startElem.disabled = true;
    callElem.disabled = false;


     dumpOptionsInfo();
  } catch(err) {
    console.error("Error: " + err);
  }
}

function stopCapture(evt) {
  let tracks = videoElem.srcObject.getTracks();

  tracks.forEach(track => track.stop());
  videoElem.srcObject = null;
}

function call(){
  callElem.disabled = true;
  hangupElem.disabled = false;

  // create local peer connection
  localPeerConnection = new RTCPeerConnection(servers);
  localPeerConnection.addEventListener('icecandidate', handleConnectionLocal);
  localPeerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange);


  // creating the remote peer connection
  remotePeerConnection = new RTCPeerConnection(servers);
  remotePeerConnection.addEventListener('icecandidate', handleConnectionRemote)
  remotePeerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange);


  // handle when local peer adds stream
  remotePeerConnection.addEventListener('addstream', gotRemoteMediaStream);

  // add to stream 
  localPeerConnection.addStream(localStream);

  // offer options for SDP
  const offerOptions = {
    offerToReceiveVideo: 1,

  };
  // exchange SDP
  localPeerConnection.createOffer(offerOptions)
    .then(createdOffer).catch(setSessionDescriptionError);
}

function createdOffer(description) {
  // local: setLocal, remote: setRemote
  localPeerConnection.setLocalDescription(description);
  remotePeerConnection.setRemoteDescription(description);

  // remote: setLocal, local: setRemote

  // offer options for SDP
  const offerOptions = {
    offerToReceiveVideo: 1,

  };

  remotePeerConnection.createAnswer(offerOptions).then(createdAnswer).catch(setSessionDescriptionError);
}

function createdAnswer(description) {
  remotePeerConnection.setLocalDescription(description);
  localPeerConnection.setRemoteDescription(description);
}



function hangup(){
  localPeerConnection.close()
  remotePeerConnection.close()
  localPeerConnection = null;
  remotePeerConnection = null;
  hangupElem.disabled = true;
  callElem.disabled = false;
}

function handleConnectionLocal(event) {
  // send local icecandidate to remote 
  const icecandidate = event.candidate;
  const newIceCandidate = new RTCIceCandidate(icecandidate); 

  // remote adds local's ice candidate
  if(icecandidate) {
    remotePeerConnection.addIceCandidate(newIceCandidate);
  }
}

function handleConnectionRemote(event) {
  // send remote icecandidate to local
  const icecandidate = event.candidate;
  const newIceCandidate =  new RTCIceCandidate(icecandidate);

  // local adds remote's ice candidate
  if(icecandidate) {
    localPeerConnection.addIceCandidate(newIceCandidate);
  }
}

function gotRemoteMediaStream(event) {
  const mediaStream = event.stream;
  remoteVideoElem.srcObject = mediaStream;
  remoteStream = mediaStream;
}


function dumpOptionsInfo() {
  const videoTrack = videoElem.srcObject.getVideoTracks()[0];
 
  console.info("Track settings:");
  console.info(JSON.stringify(videoTrack.getSettings(), null, 2));
  console.info("Track constraints:");
  console.info(JSON.stringify(videoTrack.getConstraints(), null, 2));
}

// Logs error when setting session description fails.
function setSessionDescriptionError(error) {
  trace(`Failed to create session description: ${error.toString()}.`);
}

function handleConnectionChange(event) {
  const peerConnection = event.target;
  console.log('ICE state change event: ', event);
  trace(`${getPeerName(peerConnection)} ICE state: ` +
        `${peerConnection.iceConnectionState}.`);
}