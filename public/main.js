var start = Date.now();
var rawCounts = [];

$(document).ready(function() {
  aj();
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

var round = Math.round;
var interv;
function aj2() {
  $(".gened").remove();
  clearInterval(interv);
  rawCounts = [];
  aj();
}
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


      // for (let i = 0; i < data.texts.length; i++) {
      //   temp.push([data.texts[i], data.times[i], data.countDown[i]]);
      // }


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
        let tr = $("<tr/>").addClass("gened");
        tr.append($('<td class="texts chble">' + t[i][0] + "</td>"));
        tr.append($('<td class="address chble">' + t[i][3] + "</td>"));
        tr.append($('<td class="time-left">'));
        tr.append($('<td class="scheduled chble">' + t[i][1] + ':' + t[i][2] + "</td>"));
        tr.appendTo(table);
        rawCounts.push(t[i][4]);
      }
      doStuff();
      count();
      setDinInputs();
    },
    error: function(jqXHR, textStatus, errorThrown) {
      alert('error ' + textStatus + " " + errorThrown);
    }
  });
}
function count() {
  interv = setInterval(function() {
    doStuff();
  }, 1000);
}
function doStuff() {
  let d = (Date.now() - start);
  $(".time-left").each(function(index) {
    let text = '';
    let expr = round((rawCounts[index] - d));

    if (expr <= 0)
      rawCounts[index] += 1000 * 60 * 60 * 23;

    let date = new Date(expr);
    date.setHours(date.getHours() - 2);

    // let secs = expr % 60;
    // expr -= secs;
    // let mins = expr % 3600 / 60;
    // expr -= mins;
    // let hrs = round(expr / 60 / 60) - 1;
    //
    //
    // text = (((hrs <= 0) ? '' : hrs + ':') +
    // ((mins <= 0 && hrs <= 0) ? '' : ((mins < 10) ? '0' + mins : mins) + ':') +
    // ((secs < 10) ? '0' + secs : secs));

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
function setDinInputs() {
  gened = $(".gened td").not(".time-left");
  $.each(gened, function() {
    let data = jQuery._data(this, 'events');
    if (!data) {
      $(this).click(function(e) {
        e.stopPropagation();
        let t = $(this);
        if (t.find(".din-input").length != 0) return;
        softlyRemoveInputs();
        val = t.html();
        t.html("");
        t.css("padding", "0 0 0 7px");
        t.append($("<input>")
          .val(val)
          .addClass("din-input")
          .css("width", (val.length + 1) * 8 + 'px')
          .css("backgroundColor", window.getComputedStyle(t[0], null).getPropertyValue('background-color'))
          .on("input", function() {
            $(this).css("width", ($(this).val().length + 1) * 8 + 'px');
          })
        );
        t.find(".din-input")[0].select();
      })
    }
  })

}
function softlyRemoveInputs() {
  let el = $(".din-input");
  let par = el.parent();
  let val = el.val();
  el.remove();
  par.html(val);
  par.css("padding", "8px")
}
