import { Pane } from 'tweakpane';
import { delay } from "./utils";
import { flyToRouteBounds, addDebugPointerToMap, clearRouteMarkers, flyToCurrentGPSLocation, rotateCamera, stopRotateCamera } from "./map";

const pane = new Pane();
pane.hidden = true;

const PARAMS = {
  percentage: 50,
  theme: 'dark',
};

// `min` and `max`: slider
pane.addBinding(
  PARAMS, 'percentage',
  { min: 0, max: 100, step: 10 }
);

// `options`: list
pane.addBinding(
  PARAMS, 'theme',
  { options: { Dark: 'dark', Light: 'light' } }
);

// Fly to route bounds
const flyToRoute = pane.addButton({
  title: 'Fly to route bounds',
});

flyToRoute.on('click', () => {
  flyToRouteBounds();
});

// Add debug point
const addDebugPointer = pane.addButton({
  title: 'Add debug pointer',
});

addDebugPointer.on('click', () => {
  addDebugPointerToMap();
});

// Remove route markers
const removeRouteMarkers = pane.addButton({
  title: 'Clear route markers',
});

removeRouteMarkers.on('click', () => {
  clearRouteMarkers();
});

// Remove route markers
const flyToCurrentLocation = pane.addButton({
  title: 'Fly to current location',
});

flyToCurrentLocation.on('click', () => {
  flyToCurrentGPSLocation();
});

// Start / stop camera rotation
const startCameraRotation = pane.addButton({
  title: 'Start camera rotation',
});

startCameraRotation.on('click', () => {
  rotateCamera(0);
});

const stopCameraRotation = pane.addButton({
  title: 'Stop camera rotation',
});

stopCameraRotation.on('click', () => {
  stopRotateCamera();
});

// Show / hide debug menu
document.addEventListener('keydown', (event) => {
  if (event.code === 'KeyD') {
    pane.hidden = !pane.hidden;
  }
});