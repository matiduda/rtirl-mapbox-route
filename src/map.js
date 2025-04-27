import { loadRouteGPX, getClosestTrackPointInfo } from "./route";
import CityLabel from "./cityLabel";
import GPSLabel from "./gpsLabel";
import { delay } from "./utils";

// Add support for GPX
VectorTextProtocol.addProtocols(maplibregl);

const ROUTE_WAYPOINTS_NAME = "ROUTE (GPX)";
const ROUTE_WAYPOINTS_GPX_URL = "gpx://route.gpx";

const MAPTILER_API_KEY = "uxEQLjImLZS6TTxJxpTU";

export const map = new maplibregl.Map({
  container: "map",
  style: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_API_KEY}`,
  center: [19.65739308407342, 53.10323008206103],
  zoom: 7,
  pitch: 0,
  bearing: -10,
  canvasContextAttributes: { antialias: true }
});

export function resetCamera() {
  map.rotateTo(0, { duration: 50000, essential: true });
}

export function rotateCamera() {
  map.rotateTo(100, { duration: 50000, essential: true });
}

export function stopRotateCamera() {
  pauseRotateCamera = true;
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

// Route markers
let activeMarkers = [];

let currentGPSLocation;
let currentRTIRLLocation;
let currentlyAnimatedRTIRLLocation;
let gpsPointerInitialized = false;
let currentGPSLabel;

map.on("load", async () => {

  gpx = await loadRouteGPX();
  console.log(gpx);

  // addRouteMarkers(gpx);

  // Add 3d buildings and remove label layers to enhance the map
  const layers = map.getStyle().layers;

  let labelLayerId;
  for (let i = 0; i < layers.length; i++) {
    if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
      labelLayerId = layers[i].id;
      break;
    }
  }

  map.addSource('openmaptiles', {
    url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${MAPTILER_API_KEY}`,
    type: 'vector',
  });

  map.addLayer(
    {
      'id': '3d-buildings',
      'source': 'openmaptiles',
      'source-layer': 'building',
      'type': 'fill-extrusion',
      'minzoom': 15,
      'filter': ['!=', ['get', 'hide_3d'], true],
      'paint': {
        'fill-extrusion-color': 'hsl(0, 0%, 6%)',
        'fill-extrusion-height': [
          'interpolate',
          ['linear'],
          ['zoom'],
          15,
          0,
          16,
          ['get', 'render_height']
        ],
        'fill-extrusion-base': ['case',
          ['>=', ['get', 'zoom'], 16],
          ['get', 'render_min_height'], 0
        ],
        'fill-extrusion-opacity': 0.7
      }
    },
    labelLayerId
  );


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
      "line-color": "#AAA",
      "line-width": 10,
      'line-opacity': 1,
    },
    'layout': {
      'line-cap': 'round',
      'line-join': 'round'
    },
  });

  addAnimatedProgressLine();
  flyToRouteBounds();
  initializeInfiniteAnimation();
});

export const flyToRouteBounds = (speed = 0.2, essential = true) => {
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
    padding: 30,
    speed: speed,
    pitch: 60,
    bearing: 20,
    essential: essential,
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

// Current location marker

const size = 100;

// implementation of StyleImageInterface to draw a pulsing dot icon on the map
// Search for StyleImageInterface in https://maplibre.org/maplibre-gl-js/docs/API/
const pulsingDot = {
  width: size,
  height: size,
  data: new Uint8Array(size * size * 4),

  // get rendering context for the map canvas when layer is added to the map
  onAdd() {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    this.context = canvas.getContext('2d');
  },

  // called once before every frame where the icon will be used
  render() {
    const duration = 2000;
    const t = (performance.now() % duration) / duration;

    const radius = (size / 2) * 0.3;
    const outerRadius = (size / 2) * 0.7 * t + radius;
    const context = this.context;

    // draw outer circle
    context.clearRect(0, 0, this.width, this.height);
    context.beginPath();
    context.arc(
      this.width / 2,
      this.height / 2,
      outerRadius,
      0,
      Math.PI * 2
    );
    context.fillStyle = `rgba(255, 200, 200,${1 - t})`;
    context.fill();

    // draw inner circle
    context.beginPath();
    context.arc(
      this.width / 2,
      this.height / 2,
      radius,
      0,
      Math.PI * 2
    );
    context.fillStyle = 'rgba(255, 100, 100, 1)';
    context.strokeStyle = 'white';
    context.lineWidth = 2 + 4 * (1 - t);
    context.fill();
    context.stroke();

    // update this image's data with data from the canvas
    this.data = context.getImageData(
      0,
      0,
      this.width,
      this.height
    ).data;

    // continuously repaint the map, resulting in the smooth animation of the dot
    map.triggerRepaint();

    // return `true` to let the map know that the image was updated
    return true;
  }
};

export const addCurrentLocationPointerToMap = () => {
  // Add a single point to the map

  map.addImage('pulsing-dot', pulsingDot, { pixelRatio: 2 });

  map.addSource('points', {
    'type': 'geojson',
    'data': {
      'type': 'FeatureCollection',
      'features': [
        {
          'type': 'Feature',
          'geometry': {
            'type': 'Point',
            'coordinates': [currentlyAnimatedRTIRLLocation.longitude, currentlyAnimatedRTIRLLocation.latitude]
          }
        }
      ]
    }
  });
  map.addLayer({
    'id': 'points',
    'type': 'symbol',
    'source': 'points',
    'layout': {
      'icon-image': 'pulsing-dot'
    }
  });

  // add label to map
  currentGPSLabel = new GPSLabel(currentlyAnimatedRTIRLLocation);

  const gpsLabelMarker = new maplibregl.Marker({ element: currentGPSLabel.element });

  gpsLabelMarker
    .setLngLat([currentlyAnimatedRTIRLLocation.longitude, currentlyAnimatedRTIRLLocation.latitude])
    .addTo(map);

  currentGPSLabel.setMarker(gpsLabelMarker);
}

function updateCurrentLocationPointer() {
  const geojson = {
    'type': 'FeatureCollection',
    'features': [
      {
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [currentlyAnimatedRTIRLLocation.longitude, currentlyAnimatedRTIRLLocation.latitude]
        }
      }
    ]
  };

  map.getSource('points').setData(geojson);

  currentGPSLabel.marker
    .setLngLat([currentlyAnimatedRTIRLLocation.longitude, currentlyAnimatedRTIRLLocation.latitude])
}

// GPS Location handling

function updateCurrentLocation(longitude, latitude) {
  currentGPSLocation = {
    longitude: longitude,
    latitude: latitude,
  }

  // Find the closest point to GPX path
  closestPointInfo = getClosestTrackPointInfo(gpx, longitude, latitude);

  if (!closestPointMarker) {
    // add marker to map
    closestPointMarker = new maplibregl.Marker({})

    closestPointMarker
      .setLngLat([closestPointInfo.point.longitude, closestPointInfo.point.latitude])
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
      'line-opacity': 1,
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


  const nextAnimationPointIndex = Math.min(currentAnimationPointIndex + speedFactor, closestPointInfo.index);

  // Append all points between current and next indexes
  for (let i = currentAnimationPointIndex; i < nextAnimationPointIndex; i++) {
    const point = gpx.tracks[0].points[i];
    geojson.features[0].geometry.coordinates.push([point.longitude, point.latitude]);
  }

  currentAnimationPointIndex = nextAnimationPointIndex;

  // then update the map
  map.getSource('line').setData(geojson);

  // Check if any route marker has been reached
  activeMarkers.forEach(activeMarker => {
    if (!activeMarker.marker) {
      return;
    }

    const currentDistance = gpx.tracks[0].distance.cumulative[currentAnimationPointIndex];

    if (currentDistance >= activeMarker.closestPointInfo.distance && !activeMarker.highlighted) {
      activeMarker.highlight();
    }
  });

  // Request the next frame of the animation.
  requestAnimationFrame(animateLine);
}

async function addRouteMarkers(gpx) {
  if (activeMarkers.length !== 0) {
    console.log("Can't add markers, they have to be cleared first!", activeMarkers);
    return;
  }

  // Add markers for waypoints
  for (const waypoint of gpx.waypoints) {

    // Find closest matching point in route points
    const waypointClosestPointInfo = getClosestTrackPointInfo(gpx, waypoint.longitude, waypoint.latitude);

    // They are custom animated DOM elements
    const cityLabel = new CityLabel(waypoint, waypointClosestPointInfo);

    // add marker to map
    const marker = new maplibregl.Marker({ element: cityLabel.element })
      .setLngLat([waypoint.longitude, waypoint.latitude])
      .addTo(map);

    cityLabel.setMarker(marker);
    activeMarkers.push(cityLabel);

    await delay(2000);
  };
}

export function clearRouteMarkers() {
  if (activeMarkers.length === 0) {
    console.log("There are no route markers to be cleared!");
    return;
  }

  for (const activeMarker of activeMarkers) {
    activeMarker.marker.remove();
  }

  activeMarkers = [];
}

// Fly to current GPS location

export function flyToCurrentGPSLocation() {
  if (!currentlyAnimatedRTIRLLocation) {
    console.log("[flyToCurrentGPSLocation] currentlyAnimatedRTIRLLocation location not set!");
    return;
  }

  map.flyTo({
    center: [
      currentlyAnimatedRTIRLLocation.longitude,
      currentlyAnimatedRTIRLLocation.latitude,
    ],
    zoom: 17,
    pitch: 40,
    speed: 0.3,
    curve: 1,
    essential: true
  });
}

async function initializeInfiniteAnimation() {
  // Wait for the loading animation to complete
  await delay(4_000);

  // Remove loading div
  const loadingDiv = document.getElementById('loading');
  loadingDiv.remove();

  startInfiniteAnimation()
}

async function startInfiniteAnimation() {
  rotateCamera();
  addRouteMarkers(gpx);

  // Wait for route marker animation to progress
  await delay(7000);

  if (currentRTIRLLocation) {
    console.log("[startInfiniteAnimation] Most recent GPS location: ", currentRTIRLLocation);
    currentlyAnimatedRTIRLLocation = { ...currentRTIRLLocation };

    if (!gpsPointerInitialized) {
      addCurrentLocationPointerToMap();
      gpsPointerInitialized = true;
    } else {
      updateCurrentLocationPointer();
    }

    updateCurrentLocation(currentlyAnimatedRTIRLLocation.longitude, currentlyAnimatedRTIRLLocation.latitude);

    // Wait for map rotation
    await delay(10_000);

    flyToCurrentGPSLocation();

    // Wait for the fly to complete
    await delay(25_000);

    rotateCamera();

    await delay(10_000);

    clearRouteMarkers();
    flyToRouteBounds();

    await delay(20_000);
  } else {
    console.log("[startInfiniteAnimation] No current GPS location!");
    const warn = document.getElementById('no_gps_warn');
    warn.style.opacity = 1;
    await delay(20_000);
    resetCamera()
    await delay(30_000);
    warn.style.opacity = 0;
    clearRouteMarkers();
    await delay(2_000);
    flyToRouteBounds();
  }

  startInfiniteAnimation();
}

export function upadteRTIRLLocation(location) {
  currentRTIRLLocation = location;
}