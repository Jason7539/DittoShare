socket.on("recieveClientCandidate", function(data){
    clientIceCandidates.push(data.clientSDP);

    for(i = 0; i < rooms.length; i++){
        if(data.roomName == rooms[i].roomName){

            // check if clientSDP exists

            // Check if uniqId in there already.
            var idExists = false;
            for(j = 0; j < rooms[i].clientSDP.length; j++){
                if(rooms[i].clientSDP[j].id == data.id){
                    console.log("WE GOT ID MATCH: ");
                    idExists = true;

                    rooms[i].clientSDP[j].SDPs.push(data.clientSDP);

                    return;
                }
            }

            // This is the first id insert in client SDP
            console.log("PLACING IN NEW SDP FIRST TIME");
            rooms[i].clientSDP.push({"id":data.id, "SDPs": []});
            return;
        }
    }
    console.log("Client candidates: " + JSON.stringify(data.clientSDP));
});