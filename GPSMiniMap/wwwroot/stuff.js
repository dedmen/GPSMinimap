// Note: This example requires that you consent to location sharing when
// prompted by your browser. If you see the error "The Geolocation service
// failed.", it means you probably did not give permission for the browser to
// locate you.
let map, curPosMarker, automoveBlockedUntil;

var connection = new signalR.HubConnectionBuilder()
.withUrl("/chatHub")
.configureLogging(signalR.LogLevel.Information)
.withAutomaticReconnect()
.build();

automoveBlockedUntil = 0;

// URL contains ?sendOnly, don't display a map
let isSendOnly = window.location.href.indexOf("?sendOnly") > -1;
// URL contains ?obs
let isOBS = window.location.href.indexOf("?obs") > -1;
let isOBS2 = window.location.href.indexOf("?obs2") > -1;
// URL contains ?desktop
let isDesktop = isOBS || window.location.href.indexOf("?desktop") > -1;

function initMap() {
  if (isSendOnly) // sendOnly has no map
    return;

  let defaultZoom = 16;
  if (isOBS)
    defaultZoom = 18;

  let defaultTypeID = google.maps.MapTypeId.ROADMAP;
  if (isOBS && isOBS2)
    defaultTypeID = google.maps.MapTypeId.SATELLITE;

  if (window.location.href.indexOf("zoom=") > -1){ 
    defaultZoom = parseFloat(window.location.href.substr(window.location.href.indexOf("zoom=")+5));
  }

  map = new google.maps.Map(document.getElementById("map"), {
    center: {
      lat: 37.7893719,
      lng: -122.3942,
    },

    zoom: defaultZoom,
    heading: 320,
    tilt: 47.5,
    mapId: "9f859f206c766f13",
    disableDefaultUI: isOBS,
    streetViewControl: false,
    mapTypeId: defaultTypeID,
    gestureHandling: "greedy", // grab all gestures
  });

  const trafficLayer = new google.maps.TrafficLayer({map: map});

  curPosMarker = new google.maps.Marker({
    position: {
      lat: 37.7893719,
      lng: -122.3942,
    },
    map: map,
    icon: { // https://developers.google.com/maps/documentation/javascript/reference/marker#Symbol
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 4
    }
  });

//#TODO https://developers.google.com/maps/documentation/javascript/events#MarkerEvents on manual zoom, don't set center on pos updates for a few seconds

  map.addListener("drag", () => {
    // block autocenter for next 5 seconds
    automoveBlockedUntil = new Date().valueOf() + 5000;
  });





}

connection.start().then(function () {
	
  // Add location listener
  
  // Try HTML5 geolocation.
  if (!isDesktop && navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => {
        // https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates

        connection.invoke("UpdatePosition", JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude,
          accuracy: position.coords.accuracy,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed
        })
        ).catch(function (err) {
            return console.error(err.toString());
        });
      },
      () => {
        //handleLocationError(true, infoWindow, map.getCenter());
      },
      {
          maximumAge: 1000, // maximum age to use a cached position
          enableHighAccuracy: false // don't need high accuracy, that would make it slower
      }
    );
  }


}).catch(function (err) {
    return console.error(err.toString());
});



// Select the node that will be observed for mutations
var targetNode = document.getElementById('map');

// Options for the observer (which mutations to observe)
var config = { attributes: false, childList: true };

// Callback function to execute when mutations are observed
var callback = function(mutationsList) {
    for(var mutation of mutationsList) {
        if (mutation.type == 'childList') {
            const dismissButton = document.getElementsByClassName('dismissButton');
            //console.log(dismissButton);
            if (dismissButton.length) {
              dismissButton[0].click();
            }

            //console.log('A child node has been added or removed.');
            //console.log(mutation);
        }
    }
};

// Create an observer instance linked to the callback function
var observer = new MutationObserver(callback);

// Start observing the target node for configured mutations
observer.observe(targetNode, config);

// Later, you can stop observing
//observer.disconnect();





connection.on("UpdatePosition", function (message) {
    const obj = JSON.parse(message);
    console.log(obj);
    
    // obj format is coords
    // https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates
    
    
    const pos = {
        lat: obj.latitude,
        lng: obj.longitude,
      };
    

    if (!automoveBlockedUntil)
    {
      map.setCenter(pos);
      map.setHeading(obj.heading);
    } else {
      let curTime = new Date().valueOf();
      if (curTime > automoveBlockedUntil)
        automoveBlockedUntil = 0;
    }
    
    curPosMarker.setPosition(pos);

});