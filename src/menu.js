import { Pane } from 'tweakpane';
import { delay } from "./utils";
import { flyToRouteBounds, addDebugPointerToMap } from "./map";

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

// Show / hide debug menu
document.addEventListener('keydown', (event) => {
  if (event.code === 'KeyD') {
    pane.hidden = !pane.hidden;
  }
});

delay(3000).then(() => {
  const debugHint = document.getElementById('debug-hint');
  const fadeOffSeconds = 1;
  debugHint.style.transition = `${fadeOffSeconds}s`;
  debugHint.style.opacity = 0;
  delay(fadeOffSeconds * 1000).then(() => debugHint.remove());
});