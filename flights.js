var net = require('net');
var firebase = require("firebase");

firebase.initializeApp({
  serviceAccount: "../Flights-4a11006477e0.json",
  databaseURL: "https://flights-e282c.firebaseio.com"
});

var flightsRef = firebase.database().ref('flights/')

var client = new net.Socket();
client.connect(30003, '192.168.0.30', function() {
  console.log('Connected');
});

client.on('data', function(data) {
  data = "" + data
  data = data.replace(/(\r\n|\n|\r)/gm,"");

  var d = data.split(",");

  if (d[0] !== "MSG") return;

  console.log("ID: " + d[4] + "  " +
              "Alt: " + d[11] + "  " +
              "Lat: " + d[15] + "  " +
              "Lon: " + d[14] + "  " +
              "Head: " + d[13] + "  " +
              "Speed: " + d[12] + "  " +
              "Flight: " + d[10])

  if (d[4].length == 0) return;

  var fb = {}
  fb["id"] = d[4];
  
  if (d[11].length > 0) fb["alt"] = d[11];
  if (d[15].length > 0) fb["lat"] = d[15];
  if (d[14].length > 0) fb["lon"] = d[14];
  if (d[13].length > 0) fb["head"] = d[13];
  if (d[12].length > 0) fb["speed"] = d[12];
  if (d[10].length > 0) fb["flight"] = d[10];
  
  flightsRef.child(d[4]).update(fb);

});

client.on('close', function() {
  console.log('Connection closed');
});