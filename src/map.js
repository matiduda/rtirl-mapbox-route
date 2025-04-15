import { loadRouteGPX, getClosestTrackPointInfo } from "./route";

// Add support for GPX
VectorTextProtocol.addProtocols(maplibregl);

const ROUTE_WAYPOINTS_NAME = "ROUTE (GPX)";
const ROUTE_WAYPOINTS_GPX_URL = "gpx://route.gpx";

export const map = new maplibregl.Map({
  container: "map",
  style:
    "https://api.maptiler.com/maps/streets/style.json?key=uxEQLjImLZS6TTxJxpTU",
  center: [19.65739308407342, 53.10323008206103],
  zoom: 7,
  pitch: 60,
});

function rotateCamera(timestamp) {
  // clamp the rotation between 0 -360 degrees
  // Divide timestamp by 100 to slow rotation to ~10 degrees / sec
  map.rotateTo((timestamp / 500) % 360, { duration: 0 });
  // Request the next frame of the animation.
  requestAnimationFrame(rotateCamera);
}

let gpx;
let closestPointInfo;
let closestPointMarker;

// Route progress line

// Create a GeoJSON source with an empty lineString.
const geojson = {
  'type': 'FeatureCollection',
  'features': [
    {
      'type': 'Feature',
      'geometry': {
        'type': 'LineString',
        'coordinates': []
      }
    }
  ]
};

const speedFactor = 30; // number of points per frame
let currentAnimationPointIndex = 0;
let resetTime = false; // indicator of whether time reset is needed for the animation
let isProgressLineRunning = false;

map.on("load", async () => {

  gpx = await loadRouteGPX();
  console.log(gpx);

  // Add markers for waypoints
  gpx.waypoints.forEach(waypoint => {
    const marker = new maplibregl.Marker()
      .setLngLat([waypoint.longitude, waypoint.latitude])
      .addTo(map);
  });

  // Start the animation.
  rotateCamera(0);

  // Add 3d buildings and remove label layers to enhance the map
  const layers = map.getStyle().layers;

  map.addLayer({
    id: "3d-buildings",
    source: "openmaptiles",
    "source-layer": "building",
    filter: ["==", "extrude", "true"],
    type: "fill-extrusion",
    minzoom: 24,
    paint: {
      "fill-extrusion-color": "#aaa",

      // use an 'interpolate' expression to add a smooth transition effect to the
      // buildings as the user zooms in
      "fill-extrusion-height": [
        "interpolate",
        ["linear"],
        ["zoom"],
        15,
        0,
        15.05,
        ["get", "height"],
      ],
      "fill-extrusion-base": [
        "interpolate",
        ["linear"],
        ["zoom"],
        15,
        0,
        15.05,
        ["get", "min_height"],
      ],
      "fill-extrusion-opacity": 0.6,
    },
  });

  map.addSource(ROUTE_WAYPOINTS_NAME, {
    'type': 'geojson',
    'data': ROUTE_WAYPOINTS_GPX_URL,
  });

  map.addLayer({
    'id': ROUTE_WAYPOINTS_NAME,
    'type': 'line',
    'source': ROUTE_WAYPOINTS_NAME,
    'minzoom': 0,
    'maxzoom': 20,
    "paint": {
      "line-color": "#888",
      "line-width": 8,
    }
  });

  // Animate the route progress line
  addAnimatedProgressLine();
});

export const flyToRouteBounds = () => {
  // Geographic coordinates of the LineString
  const geojson = gpx.toGeoJSON();
  const coordinates = geojson.features[0].geometry.coordinates;

  // Pass the first coordinates in the LineString to `lngLatBounds` &
  // wrap each coordinate pair in `extend` to include them in the bounds
  // result. A variation of this technique could be applied to zooming
  // to the bounds of multiple Points or Polygon geometries - it just
  // requires wrapping all the coordinates with the extend method.
  const bounds = coordinates.reduce((bounds, coord) => {
    return bounds.extend(coord);
  }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));

  map.fitBounds(bounds, {
    padding: 20
  });
}

// Add a dragabble pointer
export const addDebugPointerToMap = () => {

  function onMove(e) {
    const coords = e.lngLat;

    // Set a UI indicator for dragging.
    canvas.style.cursor = 'grabbing';

    // Update the Point feature in `geojson` coordinates
    // and call setData to the source layer `point` on it.
    geojson.features[0].geometry.coordinates = [coords.lng, coords.lat];
    map.getSource('point').setData(geojson);
  }

  function onUp(e) {
    const coords = e.lngLat;

    // Print the coordinates of where the point had
    // finished being dragged to on the map.
    coordinates.style.display = 'block';
    coordinates.innerHTML =
      `Longitude: ${coords.lng}<br />Latitude: ${coords.lat}`;
    canvas.style.cursor = '';

    updateCurrentLocation(coords.lng, coords.lat);

    // Unbind mouse/touch events
    map.off('mousemove', onMove);
    map.off('touchmove', onMove);
  }

  const canvas = map.getCanvasContainer();

  const geojson = {
    'type': 'FeatureCollection',
    'features': [
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [19.65739308407342, 53.10323008206103]
        }
      }
    ]
  };

  // Add a single point to the map
  map.addSource('point', {
    'type': 'geojson',
    'data': geojson
  });

  map.addLayer({
    'id': 'point',
    'type': 'circle',
    'source': 'point',
    'paint': {
      'circle-radius': 10,
      'circle-color': '#3887be'
    }
  });

  // When the cursor enters a feature in the point layer, prepare for dragging.
  map.on('mouseenter', 'point', () => {
    map.setPaintProperty('point', 'circle-color', '#3bb2d0');
    canvas.style.cursor = 'move';
  });

  map.on('mouseleave', 'point', () => {
    map.setPaintProperty('point', 'circle-color', '#3887be');
    canvas.style.cursor = '';
  });

  map.on('mousedown', 'point', (e) => {
    // Prevent the default map drag behavior.
    e.preventDefault();

    canvas.style.cursor = 'grab';

    map.on('mousemove', onMove);
    map.once('mouseup', onUp);
  });

  map.on('touchstart', 'point', (e) => {
    if (e.points.length !== 1) return;

    // Prevent the default map drag behavior.
    e.preventDefault();

    map.on('touchmove', onMove);
    map.once('touchend', onUp);
  });
}

// GPS Location handling

function updateCurrentLocation(longitude, latitude) {
  // Find the closest point to GPX path
  closestPointInfo = getClosestTrackPointInfo(gpx, longitude, latitude);

  if (!closestPointMarker) {
    closestPointMarker = new maplibregl.Marker({
      color: "#FF0000",
    })
      .setLngLat([closestPointInfo.point.longitude, closestPointInfo.point.latitude])
      .addTo(map);
  }

  closestPointMarker.setLngLat([closestPointInfo.point.longitude, closestPointInfo.point.latitude]);
  isProgressLineRunning = true;

  animateLine();
}


// Animated progress line
function addAnimatedProgressLine() {
  map.addSource('line', {
    'type': 'geojson',
    'data': geojson
  });

  // add the line which will be modified in the animation
  map.addLayer({
    'id': 'route-progress-line-animation',
    'type': 'line',
    'source': 'line',
    'layout': {
      'line-cap': 'round',
      'line-join': 'round'
    },
    'paint': {
      'line-color': '#00ff00',
      'line-width': 10,
      'line-opacity': 1
    }
  });

  // reset startTime and progress once the tab loses or gains focus
  // requestAnimationFrame also pauses on hidden tabs by default
  document.addEventListener('visibilitychange', () => {
    resetTime = true;
  });
}

// animated in a circle as a sine wave along the map.
function animateLine(timestamp) {
  if (!isProgressLineRunning) {
    return;
  }

  if (!closestPointMarker) {
    console.error("Closest point maker is undefined and animation was triggered!");
    isProgressLineRunning = false;
    return;
  }

  // finish if it finishes a loop
  if (currentAnimationPointIndex >= closestPointInfo.index) {
    currentAnimationPointIndex = 0;
    geojson.features[0].geometry.coordinates = [];
    isProgressLineRunning = false;
    return;
  }

  // append new coordinates to the lineString
  const point = gpx.tracks[0].points[currentAnimationPointIndex];

  geojson.features[0].geometry.coordinates.push([point.longitude, point.latitude]);

  // then update the map
  map.getSource('line').setData(geojson);

  currentAnimationPointIndex += speedFactor;

  // Request the next frame of the animation.
  requestAnimationFrame(animateLine);
}