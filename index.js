var socket = io.connect();

function createRoomName() {
    // Prompt for new room to create
    let roomName = prompt("room name--:");

    // Cancel room creation if user clicks cancel
    if (roomName == null){
        return;
    }

    // Don't let user continue until they enter a name 
    while(roomName == ""){
        roomName = prompt("Enter a valid Room Name");
    }

    // Send the room name to server to create the room
    socket.emit('createRoom', {'newRoomName':roomName});

      // let user continue if room creation is successful
    socket.on("createSuccess", function(data){
        window.location.href = './host.html';

        // save name to create with socketio
        sessionStorage.setItem("roomName", roomName);
    });

    socket.on("failedNameExists", function(data){
        alert("Error: room name already exist. Try again with a different room name")
        return;
    });

    // window.location.href = './host.html';

    // prompt user is room name is taken
}

function getRoomName() {
    let roomName = prompt("Enter room to join:");
    
    // Cancel room creation if user clicks cancel
    if (roomName == null){
        return;
    }
    
    // send request to join room
    socket.emit("joinRoom", {"roomName":roomName});

    // Server sends back that join attempt passes.
    socket.on("joinPass", function(data){
        // Store uniq Id server sends. 
        sessionStorage.setItem("id", data.id);
        // Store name of joined room.
        sessionStorage.setItem("roomName", roomName);
        window.location.href = './join.html';
    });

    // Server sends back that join attempt fails
    socket.on("joinFail", function(data){
        alert("Failed to join. room name does not exists");
        return;
    });
}