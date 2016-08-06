var net = require('net');
var firebase = require("firebase");

var HOMELAT = 43.388421
var HOMELONG = -80.448815

firebase.initializeApp({
  serviceAccount: "../Flights-4a11006477e0.json",
  databaseURL: "https://flights-e282c.firebaseio.com"
});
var flightsRef = firebase.database().ref('flights/')
var distRef = firebase.database().ref('distances/')

var distances = {}

distRef.once("value", function (snap) {
  if (snap.val() !== null) distances = snap.val()
})

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
  if (d[14].length > 0) fb["lat"] = Number(d[14]);
  if (d[15].length > 0) fb["lon"] = Number(d[15]);
  if (d[13].length > 0) fb["head"] = d[13];
  if (d[16].length > 0) fb["fpm"] = d[16];
  if (d[12].length > 0) fb["speed"] = d[12];
  if (d[10].length > 0) fb["flight"] = d[10];
  if (d[6].length > 0) fb["date"] = d[6];
  if (d[7].length > 0) fb["time"] = d[7];
  if (ts > 0) fb["timestamp"] = ts;
  fb['updated'] = 1

  if ((d[14].length > 0) && (d[15].length > 0)) {
    var dist = getDistanceFromLatLonInKm(HOMELAT, HOMELONG, fb["lat"], fb["lon"])
    fb["km"] = Math.round(dist * 100) / 100
    dist = km2nm(dist)
    fb["nm"] = Math.round(dist * 100) / 100

    fb["brng"] = Math.round( getBearing(fb["lat"], fb["lon"]) )

    if (fb["brng"] in distances) {
      //See if this is the longest dist we've had at this angle
      if (distances[fb["brng"]].dist < fb["nm"]) {
        //This dist is farther, so update list and FB
        var o = {}
        o[fb["brng"]] = {dist: fb["nm"], lat: fb["lat"], lon: fb["lon"]}

        distances[fb["brng"]] = o[fb["brng"]]
        distRef.update(o)
      }
    } else {
      //No dist yet at this angle, so add it
      var o = {}
      o[fb["brng"]] = {dist: fb["nm"], lat: fb["lat"], lon: fb["lon"]}

      distances[fb["brng"]] = o[fb["brng"]]
      distRef.update(o)
    }
  }
  
  flightsRef.child("inactive/").child(d[4]).remove()
  flightsRef.child("active/").child(d[4]).update(fb);
  flightsRef.child("active/").child(d[4]).child("positions").child(ts).update({lat: Number(d[14]), lng: Number(d[15])});
});

client.on('close', function() {
  console.log('Connection closed');
});

//This loop takes care of moving inactive planes out of view
setInterval(function () {
  flightsRef.child("active/").once('value').then(function(data) {
    var af = data.val();
    for (f in af) {
      if (af[f].updated == 1) {
        flightsRef.child("active/").child(f).update({updated: 0})
      } else {
        af[f].positions = {}
        flightsRef.child("inactive/").child(f).update(af[f])
        flightsRef.child("active/").child(f).remove()
      }
    }
  });
}, 15000)


// MATH FUNCTIONS
// FROM http://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
//  AND http://www.movable-type.co.uk/scripts/latlong.html

function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}

function km2nm(km) {
  return km * 0.5399568
}

function getBearing(lat, lon) {
  var y = Math.sin(lon - HOMELONG) * Math.cos(lat);
  var x = Math.cos(HOMELAT)*Math.sin(lat) -
          Math.sin(HOMELAT)*Math.cos(lat)*Math.cos(lon - HOMELONG);
  var brng = Math.atan2(y, x).toDegrees();

  return brng;
}

/** Extend Number object with method to convert numeric degrees to radians */
if (Number.prototype.toRadians === undefined) {
    Number.prototype.toRadians = function() { return this * Math.PI / 180; };
}

/** Extend Number object with method to convert radians to numeric (signed) degrees */
if (Number.prototype.toDegrees === undefined) {
    Number.prototype.toDegrees = function() { return this * 180 / Math.PI; };
}

