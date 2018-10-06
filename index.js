'use strict';

require('dotenv-extended').load();
var restify = require('restify');
var builder = require('botbuilder');
var express = require('express');
var fs = require('fs');
// !!! Most of the bot stuff is basically copy-paste !!!

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function() {
  console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
  appId: process.env.MicrosoftAppId,
  appPassword: process.env.MicrosoftAppPassword
});

// Listen for messages from users
server.post('/api/messages', connector.listen());

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
var bot = new builder.UniversalBot(connector);

// look for an id in the file with addresses and
// return the address object if found, null — if not
// If no id is provided, return all ids as an array
function loadAdds(s) {
  // create the file if it had been deleted or simply doesn't exist
  if (!fs.existsSync("addresses.json")) {
    fs.writeFileSync('addresses.json', '', function(err) {
      if (err)
        throw err;
      return;
    });
  }
  let rawAddresses = fs.readFileSync("addresses.json");
  let a = JSON.parse(rawAddresses);

  if (Object.keys(a).length === 0) return [];
  if (s) {
    for (let i = 0; i < a.ids.length; i++) {
      if (a.ids[i].conversation.id === s) { // address found!
        return (a.ids[i]);
      }
    }
    return null;
  }
  // no id provided
  let ads = [];
  for (let i = 0; i < a.ids.length; i++) {
    ads.push(a.ids[i]);
  }
  return ads;
}
// root dialog
bot.dialog('/', function(session, args) {
  let address = session.message.address;

  var message = 'This is a test';
  session.send(message);

  pushAddress(address); // save the address
});

function sendMessage(text, address) {
  if (!address) {
    console.log("error");
    return;
  }
  console.log("Sending message to " + address);
  let msg = new builder.Message().address(address);
  msg.text(text);
  msg.textLocale('en-US');
  bot.send(msg);
}

// Save or renew an address in the json with addresses
function pushAddress(address) {
  let adds = loadAdds(); // get all addresses
  if (adds.length != 0) {
    for (let i = adds.length - 1; i >= 0; i--) {
      if (adds[i].conversation.id === address.conversation.id) {
        adds.splice(i, 1); // if an id match found, renew the address object
      }
    }
  }
  // add a new address / renew the former
  adds.push(address);

  // save the changes if any
  let t = {
    ids: adds
  };
  let data = JSON.stringify(t, null, 2);
  fs.writeFileSync('addresses.json', data, function(err) {
    if (err)
      throw err;
  });
}
/*
   _____  _____ _    _ ______ _____  _    _ _      ______
  / ____|/ ____| |  | |  ____|  __ \| |  | | |    |  ____|
 | (___ | |    | |__| | |__  | |  | | |  | | |    | |__
  \___ \| |    |  __  |  __| | |  | | |  | | |    |  __|
  ____) | |____| |  | | |____| |__| | |__| | |____| |____
 |_____/ \_____|_|  |_|______|_____/ \____/|______|______|

*/

var app = express();
var serv = app.listen(3000);

var now = Date.now();
var toDo = [];
var countDown;
var timeouts = [];

// set the timeouts, schedule sending of messages
// return contents of file with scheduled text and time
function set() {
  // clear off former values
  now = Date.now();
  toDo = [];
  countDown = null;
  timeouts.map(el => clearTimeout(el));
  timeouts = [];

  // get "texts" of messages and time
  let temp = fs.readFileSync("sched.json");
  let d = JSON.parse(temp);
  countDown = Array(d.items.length);

  for (let i = 0; i < d.items.length; i++) {
    countDown[i] = new Date();
    countDown[i].setHours(d.items[i][1], d.items[i][2], 0, 0);

    // increment by a day if passed
    if (countDown[i] - now < 0) countDown[i].setDate(countDown[i].getDate() + 1);

    // array of functions
    toDo.push((x) => {
      timeouts.push(setTimeout(() => {
        let address = loadAdds(d.items[x][3]);
        if (address) {
          sendMessage(d.items[x][0], address);
        } else {
          console.log("Error. The address not found")
        }
        // increment by a day
        countDown[x].setDate(countDown[x].getDate() + 1);
        toDo[i](i);
      }, countDown[x] - now));
    });
    //execute
    toDo[i](i);
  }
  return d;
}

// invoke the function at the start
set();

app.use(express.static(__dirname + '/public'));

var bodyParser = require('body-parser')
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
  if (countDown) { // check if intervals are set
    let temp = fs.readFileSync("sched.json");
    d = JSON.parse(temp);
  } else { // set them up otherwise
    d = set();
  }
  // send in the data
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  });
  for (let i = 0; i < d.items.length; i++) {
    d.items[i].push(countDown[i] - now);
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
  console.log("Sucessfully received data from remote");
  set(); // reset the timers to updated parameters
});
