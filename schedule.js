const fs = require('fs');
const builder = require('botbuilder');

var log = {
  now: Date.now(),
  toDo: [],
  countDown: null,
  timeouts: [],
  // set the timeouts, schedule sending of messages
  // return contents of file with scheduled text and time
  set: function(bot) {
    console.log("success");
    // clear off former values
    this.now = Date.now();
    this.toDo = [];
    this.countDown = null;
    this.timeouts.map(el => clearTimeout(el));
    this.timeouts = [];

    // get "texts" of messages and time
    let temp = fs.readFileSync("sched.json");
    let d = JSON.parse(temp);
    this.countDown = Array(d.items.length);

    for (let i = 0; i < d.items.length; i++) {
      this.countDown[i] = new Date();
      this.countDown[i].setHours(d.items[i][1], d.items[i][2], 0, 0);

      // increment by a day if passed
      if (this.countDown[i] - this.now < 0) this.countDown[i].setDate(this.countDown[i].getDate() + 1);

      // array of functions
      this.toDo.push((x) => {
        this.timeouts.push(setTimeout(() => {
          let address = this.loadAdds(d.items[x][3]);
          if (address) {
            this.sendMessage(d.items[x][0], address, bot);
          } else {
            console.log("Error. The address not found")
          }
          // increment by a day
          this.countDown[x].setDate(this.countDown[x].getDate() + 1);
          this.toDo[i](i);
        }, this.countDown[x] - this.now));
      });
      //execute
      this.toDo[i](i);
    }
    return d;
  },

  // look for an id in the file with addresses and
  // return the address object if found, null — if not
  // If no id is provided, return all ids as an array
  loadAdds: function(s) {
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
  },

  // Save or renew an address in the json with addresses
  pushAddress: function(address) {
    let adds = this.loadAdds(); // get all addresses
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
  },
  sendMessage: function(text, address, bot) {
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
};

module.exports = log;
