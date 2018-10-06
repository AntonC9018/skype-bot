var start = Date.now();
var rawCounts = [];

$(document).ready(function() {
  aj(); // loads scheduled messages from the server
  $("<button/>")
    .addClass("btn first")
    .html("Refresh")
    .click(aj2)
    .appendTo($("body"));
  $("<button/>")
    .addClass("btn fifth")
    .html("Send")
    .click(postToServer)
    .appendTo($("body"));
  $(window).click(softlyRemoveInputs);
});

var round = Math.round; // shorthand for convenience
var interv; // Interval

// refresh the list of scheduled messages
function aj2() {
  $(".gened").remove(); // delete generated rows
  // the "start" time is going to be renewed
  // so the interval must be renewed too
  clearInterval(interv);
  rawCounts = [];
  aj(); // same ajax call as at the start
}

// get data from the server
function aj() {
  start = Date.now();
  $.ajax({
    url: location + 'getData',
    dataType: "jsonp",
    jsonpCallback: "_testcb",
    cache: false,
    timeout: 5000,
    success: function(data) {
      let t = data.items;

      t.sort((a, b) => {
        if (a[4] < b[4]) {
          return -1;
        }
        if (a[4] > b[4]) {
          return 1;
        }
        // a must be equal to b
        return 0;
      });

      let table = $("#schedule");
      for (let i = 0; i < t.length; i++) {
        let tr = $("<tr/>").addClass("gened"); // add a row
        // add items to the row
        tr.append($('<td class="texts chble">' + t[i][0] + "</td>"));
        tr.append($('<td class="address chble">' + t[i][3] + "</td>"));
        tr.append($('<td class="time-left">'));
        tr.append($('<td class="scheduled chble">' + t[i][1] + ':' + t[i][2] + "</td>"));
        tr.appendTo(table);
        rawCounts.push(t[i][4]); // register how much time left
      }
      displayTimeLeft();
      tick(); // start time-left changer
      setDinamInputs();
    },
    error: function(jqXHR, textStatus, errorThrown) {
      alert('error ' + textStatus + " " + errorThrown);
    }
  });
}
// start changing time left every second
function tick() {
  interv = setInterval(function() {
    displayTimeLeft();
  }, 1000);
}
function displayTimeLeft() {
  let d = (Date.now() - start);
  $(".time-left").each(function(index) {
    let text = '';
    let expr = round((rawCounts[index] - d));

    if (expr <= 0)
      rawCounts[index] += 1000 * 60 * 60 * 23;

    let date = new Date(expr);
    date.setHours(date.getHours() - 2);

    text = date.toTimeString().substring(0, 8).trim();
    $(this).html(text);
  });
}
function postToServer() {
  softlyRemoveInputs();

  let $texts = $(".texts");
  let $addresses = $(".address");
  let $time = $(".scheduled");
  let data = {
    it: []
  };

  for (let i = 0; i < $time.length; i++) {
    let arr = [];
    arr.push($texts[i].innerHTML);
    let str = $time[i].innerHTML;
    let t = (str.split(":"));
    arr.push(t[0]);
    arr.push(t[1]);
    arr.push($addresses[i].innerHTML);
    data.it.push(arr);
  }
  $.ajax({
    type: "POST",
    url: location + 'reload',
    data: JSON.stringify(data),
    success: function() {
      console.log("success");
    },
    contentType: "application/json"
  });
}
// turn table cell into an iput field and let user modify it
function setDinamInputs() {
  gened = $(".gened td").not(".time-left");

  $.each(gened, function() { // get all cells
    let data = jQuery._data(this, 'events');
    if (!data) { // if it doesn't have a listener already
      $(this).click(function(e) {
        e.stopPropagation();
        let t = $(this);

        // no need to turn it into an input, it already is one!
        if (t.find(".din-input").length != 0) return;

        // remove all other inputs
        softlyRemoveInputs();

        val = t.html();
        t.html("");
        t.css("padding", "0 0 0 7px");
        t.append($("<input>")
          .val(val) // assign input this cell's value
          // css stuff
          .addClass("din-input")
          .css("width", (val.length + 1) * 8 + 'px')
          .css("backgroundColor", window.getComputedStyle(t[0], null)
            .getPropertyValue('background-color'))
          .on("input", function() {
            $(this).css("width", ($(this).val().length + 1) * 8 + 'px');
          })
        );
        t.find(".din-input")[0].select();
      })
    }
  })
}
// turn inputs back into normal cells
// i.e. remove them, and assign their values to cells
function softlyRemoveInputs() {
  let el = $(".din-input");
  let par = el.parent();
  let val = el.val();
  el.remove();
  par.html(val);
  par.css("padding", "8px")
}
