'use strict';

require('dotenv-extended').load();
const restify = require('restify');
const builder = require('botbuilder');
const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const sch = require('./schedule.js');

// !!! Most of the bot stuff is basically copy-paste !!!

// Setup Restify Server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function() {
  console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
const connector = new builder.ChatConnector({
  appId: process.env.MicrosoftAppId,
  appPassword: process.env.MicrosoftAppPassword
});

// Listen for messages from users
server.post('/api/messages', connector.listen());

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
const bot = new builder.UniversalBot(connector);

// root dialog
bot.dialog('/', function(session, args) {
  let address = session.message.address;
  let message = 'This is a test';
  session.send(message);
  sch.pushAddress(address); // save the address
});

/*
   _____  _____ _    _ ______ _____  _    _ _      ______
  / ____|/ ____| |  | |  ____|  __ \| |  | | |    |  ____|
 | (___ | |    | |__| | |__  | |  | | |  | | |    | |__
  \___ \| |    |  __  |  __| | |  | | |  | | |    |  __|
  ____) | |____| |  | | |____| |__| | |__| | |____| |____
 |_____/ \_____|_|  |_|______|_____/ \____/|______|______|

*/

const app = express();
const serv = app.listen(3000);

// invoke the function at the start
sch.set(bot);

app.use(express.static(__dirname + '/public'));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
  extended: false
}))
// parse application/json
app.use(bodyParser.json())

// send data to client
app.get('/getData', function(req, res) {
  console.log("Sending data to client");
  let d = {};
  if (sch.countDown) { // check if intervals are set
    let temp = fs.readFileSync("sched.json");
    d = JSON.parse(temp);
  } else { // set them up otherwise
    d = sch.set(bot);
  }
  // send in the data
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  });
  for (let i = 0; i < d.items.length; i++) {
    d.items[i].push(sch.countDown[i] - sch.now);
  }
  res.end('_testcb(' + JSON.stringify(d) + ')');
});

// apply changes. Renew schedule (file with texts and time)
app.post('/reload', function(req, res) {
  let newSched = {
    items: req.body.it
  }
  fs.writeFileSync('sched.json', JSON.stringify(newSched, null, 2), (err) => {
    console.log(err);
  });
  console.log("Sucessfully received data from client");
  sch.set(bot); // reset the timers to updated parameters
});

app.get('/addresses', function(req, res) {
  console.log('Client accessed addresses.json');
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  });
  res.end(fs.readFileSync("addresses.json"));
});
