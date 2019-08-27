//Store data from the list of hikes generated in destination section. The intent here is to feed back to Google maps for markers
let markerData = [];

// Initialize Google Maps and utilize Google places
function initMap() {
  var map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 37.0902, lng: -95.7129 },
    zoom: 4,
    disableDefaultUI: true,
    mapTypeId: "terrain"
  });

  // Create the search box and link it to the UI element.
  var input = document.getElementById("pac-input");
  var searchBox = new google.maps.places.SearchBox(input);
  console.log(input);
  // map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

  // Bias the SearchBox results towards current map's viewport.
  map.addListener("bounds_changed", function() {
    searchBox.setBounds(map.getBounds());
  });

  var markers = [];
  // Listen for the event fired when the user selects a prediction and retrieve
  // more details for that place.
  searchBox.addListener("places_changed", function() {
    var places = searchBox.getPlaces();

    if (places.length == 0) {
      return;
    }

    // Clear out the old markers.
    markers.forEach(function(marker) {
      marker.setMap(null);
    });
    markers = [];

    // For each place, get the icon, name and location.
    var bounds = new google.maps.LatLngBounds();
    places.forEach(function(place) {
      if (!place.geometry) {
        console.log("Returned place contains no geometry");
        return;
      }
      var icon = {
        url: place.icon,
        size: new google.maps.Size(71, 71),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(17, 34),
        scaledSize: new google.maps.Size(50, 50)
      };

      // Create a marker for each place.
      markers.push(
        new google.maps.Marker({
          map: map,
          icon: icon,
          title: place.name,
          position: place.geometry.location
        })
      );

      // Get user search longitude and latitude from Google Places to feed into Hiking Project API, this is required data for API params. This would be changed if working from server side and pulling json from Google instead of their client side api
      let userPosition = place.geometry.location;
      let searchLatitude = userPosition.lat();
      let searchLongitude = userPosition.lng();
      fetchHikingProjectData(searchLatitude, searchLongitude);

      if (place.geometry.viewport) {
        // Only geocodes have viewport.
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }
    });
    map.fitBounds(bounds);

    // refocus page to show activity selections
    $("html, body").animate({ scrollTop: $("#map").offset().top }, 1000);
    $(".activities-container").slideDown("slow");
  });
}

// Format Query Parameters
function formatQueryParams(params) {
  const queryItems = Object.keys(params).map(
    key => `${encodeURI(key)}=${encodeURI(params[key])}`
  );
  return queryItems.join("&");
}

// Fetch Hiking Project data
function fetchHikingProjectData(lat, lon) {
  baseUrl = hikingProjectApi.baseUrl;
  const params = {
    lat: lat,
    lon: lon,
    key: hikingProjectApi.key,
    maxResults: 50
  };
  let endPoint = formatQueryParams(params);
  let searchUrl = hikingProjectApi.baseUrl + endPoint;
  console.log(searchUrl);
  fetch(searchUrl)
    .then(function(response) {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error(
          "A problem has occurred fetching the Hiking Project data."
        );
      }
    })
    .then(function(hikingData) {
      goHiking(hikingData);
    })
    .catch(function(error) {
      console.log(error);
    });
}

//User selects hiking activity: ToDo: Consider breaking this into multiple functions
function goHiking(data) {
  console.log(data.trails);
  $("#activity-hiking, .load-more-hiking").on("click", function() {
    let mapNumber = 1;
    $("html, body").animate(
      { scrollTop: $("#activity-hiking").offset().top },
      1000
    );

    // This is to randomly sort the json data in order to get different results, for better performance should implement Fisher–Yates shuffle
    data.trails.sort(function() {
      return 0.5 - Math.random();
    });

    // Remove results from previous destination loads
    $(".destination-card").remove();

    $(".destination-cards-container").show();

    // I created two for loops in order to avoid problems with smaller than expected data sets
    if (data.trails.length > 4) {
      for (let i = 0; i < 5; i++) {
        // Map canvas number
        mapNumber++;

        // Feeding results data into markerData array, intended to be used to place markers on map. Markers not functional yet
        markerData[i] = new Hike(
          Number(`${mapNumber}`),
          `${data.trails[i].name}`,
          Number(`${data.trails[i].id}`),
          Number(`${data.trails[i].latitude}`),
          Number(`${data.trails[i].longitude}`)
        );

        // Create DOM elements. This should probably be a separate function
        $(".destination-options").append(
          `
          <div class="destination-card" id="${data.trails[i].id}">
            <h2 class="card-title">${data.trails[i].name}</h2>
            <div class="destination-details">
              <div class="details-container"> 
                <div class="hike-image-container">
                  <img src="${data.trails[i].imgSmall}">
                </div>
                <div class="information"</div>
                  <p><span>Summary:</span> ${data.trails[i].summary}</p>
                  <p><span>Location:</span> ${data.trails[i].location}</p>
                  <p><span>Length:</span> ${data.trails[i].length} miles</p>
                  <p><span>Elevation Gain:</span> ${data.trails[i].ascent} feet</p>
                  <p><span>High Point:</span> ${data.trails[i].high} feet</p>
                  <p><span>Difficulty:</span> ${data.trails[i].difficulty}</p>
                  <p><span>User Rating:</span> ${data.trails[i].stars}/5 Stars</p>
                  <p><span>Powered by Hiking Project:</span> <a href="${data.trails[i].url}" target="_blank">More Info</a></p>
                </div>
                <div class="hike-location" id="map${mapNumber}"></div>
            </div>
          </div>
          `
        );
      }
    } else {
      // Second for loop
      for (let i = 0; i < data.trails.length; i++) {
        $(".destination-options").append(
          `
          <div class="destination-card" id="${data.trails[i].id}">
            <h2 class="card-title">${data.trails[i].name}</h2>
            <div class="destination-details">
              <div class="details-container"> 
                <div class="hike-image-container">
                  <img src="${data.trails[i].imgSmall}">
                </div>
                <div class="information"</div>
                  <p><span>Summary:</span> ${data.trails[i].summary}</p>
                  <p><span>Location:</span> ${data.trails[i].location}</p>
                  <p><span>Length:</span> ${data.trails[i].length} miles</p>
                  <p><span>Elevation Gain:</span> ${data.trails[i].ascent} feet</p>
                  <p><span>High Point:</span> ${data.trails[i].high} feet</p>
                  <p><span>Difficulty:</span> ${data.trails[i].difficulty}</p>
                  <p><span>User Rating:</span> ${data.trails[i].stars}/5 Stars</p>
                  <p><span>Powered by Hiking Project:</span> <a href="${data.trails[i].url}" target="_blank">More Info</a></p>
                </div>
                <div class="hike-location" id="map${mapNumber}"></div>
            </div>
          </div>
          `
        );
      }
    }
    selectDestination();
  });
}

// User selects destination
function selectDestination() {
  $(".destination-card").on("click", function(event) {
    $(event.currentTarget)
      .children()
      .slideDown("slow");
    $(event.currentTarget)
      .siblings()
      .children(".destination-details")
      .slideUp();
    initDestinationMaps();
  });
}

// Object constructor that builds data for markerData array
function Hike(mapNumber, name, id, lat, lon) {
  this.mapNumber = mapNumber;
  this.name = name;
  this.id = id;
  this.lat = lat;
  this.lon = lon;
}

// Initialize maps for destination cards

function initDestinationMaps() {
  var hike1 = { lat: markerData[0].lat, lng: markerData[0].lon };
  var map2 = new google.maps.Map(document.getElementById("map2"), {
    zoom: 15,
    center: hike1
  });
  var marker = new google.maps.Marker({ position: hike1, map: map2 });

  var hike2 = { lat: markerData[1].lat, lng: markerData[1].lon };
  var map3 = new google.maps.Map(document.getElementById("map3"), {
    zoom: 15,
    center: hike2
  });
  var marker = new google.maps.Marker({ position: hike2, map: map3 });
}

// document ready
$(document).ready(function() {
  console.log("Explorer ready, adventure awaits!");
  $("body").append(
    `<script src=${googleMapsApi.scriptSrc} async defer><script>`
  );
});
