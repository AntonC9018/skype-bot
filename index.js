'use strict';

require('dotenv-extended').load();
var restify = require('restify');
var builder = require('botbuilder');
var express = require('express');
var fs = require('fs');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function() {
  //console.log(process);
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

function loadAdds(s) {
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
      if (a.ids[i].conversation.id === s) {
        return (a.ids[i]);
      }
    }
    return null;
  }
  let ads = [];
  for (let i = 0; i < a.ids.length; i++) {
    ads.push(a.ids[i])
  }
  return ads;
}
// root dialog
bot.dialog('/', function(session, args) {

  let address = session.message.address;

  var message = 'This is a test';
  session.send(message);

  pushAddress(address);

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
function pushAddress(address) {

  let adds = loadAdds();
  if (adds.length != 0) {
    for (let i = adds.length - 1; i >= 0; i--) {
      if (adds[i].conversation.id === address.conversation.id) adds.splice(i, 1);
    }
  }
  adds.push(address);
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

function set() {
  now = Date.now();
  toDo = [];
  countDown = null;
  timeouts.map(el => clearTimeout(el));
  timeouts = [];

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
set();

app.use(express.static(__dirname + '/public'));

var bodyParser = require('body-parser')
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
  extended: false
}))
// parse application/json
app.use(bodyParser.json())

app.get('/getData', function(req, res) {
  console.log("Sending data to remote")
  let d = {};
  if (countDown) {
    let temp = fs.readFileSync("sched.json");
    d = JSON.parse(temp);
  } else {
    d = set();
  }
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  });
  for (let i = 0; i < d.items.length; i++) {
    d.items[i].push(countDown[i] - now);
  }
  res.end('_testcb(' + JSON.stringify(d) + ')');
});
app.post('/reload', function(req, res) {
  let newSched = {
    items: req.body.it
  }
  fs.writeFileSync('sched.json', JSON.stringify(newSched, null, 2), (err) => {
    console.log(err);
  });
  console.log("Sucessfully received data from remote");
  set();
});
