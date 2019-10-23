# DittoShare
screen sharing web application

nodejs is required to run the application. 
to start type "node main.js" 

a self signed certificate is required to run the application 
this can be done by ssl by typing the command 

openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365

Then in main.js point to the key and certificate on line 7 of main.js

const server = require('https').createServer({
    key: fs.readFileSync('./ca/server.key'),
    cert: fs.readFileSync('./ca/server.cert')
} ,app);
