var net = require('net');
var firebase = require("firebase");

firebase.initializeApp({
  serviceAccount: "../Flights-4a11006477e0.json",
  databaseURL: "https://flights-e282c.firebaseio.com"
});

var flightsRef = firebase.database().ref('flights/')

var client = new net.Socket();
client.connect(30003, 'localhost', function() {
  console.log('Connected');
});

client.on('data', function(data) {
  data = "" + data
  data = data.replace(/(\r\n|\n|\r)/gm,"");

  var d = data.split(",");

  if (d[0] !== "MSG") return;

  var ts = new Date(d[6] + " " + d[7]).getTime()

  // console.log("id: " + d[4] + "  " +
  //             "alt: " + d[11] + "  " +
  //             "lat: " + d[15] + "  " +
  //             "lon: " + d[14] + "  " +
  //             "timestamp: " + ts + "  " +
  //             "date: " + d[6] + "  " +
  //             "time: " + d[7] + "  " +
  //             "head: " + d[13] + "  " +
  //             "speed: " + d[12] + "  " +
  //             "flight: " + d[10])

  if (d[4].length == 0) return;

  var fb = {}
  fb["id"] = d[4];
  if (d[11].length > 0) fb["alt"] = d[11];
  if (d[15].length > 0) fb["lat"] = d[15];
  if (d[14].length > 0) fb["lon"] = d[14];
  if (d[13].length > 0) fb["head"] = d[13];
  if (d[12].length > 0) fb["speed"] = d[12];
  if (d[10].length > 0) fb["flight"] = d[10];
  if (d[6].length > 0) fb["date"] = d[6];
  if (d[7].length > 0) fb["time"] = d[7];
  if (ts > 0) fb["timestamp"] = ts;
  fb['updated'] = 1
  
  flightsRef.child("active/").child(d[4]).update(fb);
});

client.on('close', function() {
  console.log('Connection closed');
});

setInterval(function () {
  flightsRef.child("active/").once('value').then(function(data) {
    var af = data.val();
    for (f in af) {
      flightsRef.child("active/").child(f).update({updated: 0})
    }
  });
}, 1000)



