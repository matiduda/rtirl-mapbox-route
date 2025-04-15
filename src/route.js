
import { parseGPX } from "@we-gold/gpxjs"

const ROUTE_GPX_URL = "route.gpx";

export const loadRouteGPX = async () => {
  const response = await fetch(ROUTE_GPX_URL);
  if (!response.ok) {
    throw new Error("Failed to fetch the file")
  }
  const data = await response.text()

  const [parsedFile, error] = parseGPX(data)

  // Or use a try catch to verify
  if (error) throw error

  return parsedFile;
}

const getDistance = (x1, y1, x2, y2) => Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));

export const getClosestTrackPointInfo = (gpx, longitude, latitude) => {
  let closestPointIndex = 0;
  let closestPoint = gpx.tracks[0].points[0];
  let closestDistance = getDistance(longitude, latitude, closestPoint.longitude, closestPoint.latitude);

  gpx.tracks[0].points.forEach((point, i) => {
    const distance = getDistance(longitude, latitude, point.longitude, point.latitude);

    if (distance < closestDistance) {
      closestPoint = point;
      closestPointIndex = i;
      closestDistance = distance;
    }
  });

  const distance = gpx.tracks[0].distance.cumulative[closestPointIndex];

  // Calculate progress for display purposes
  const progress = distance / gpx.tracks[0].distance.total;

  return {
    point: closestPoint,
    distance: closestDistance,
    index: closestPointIndex,
    distance: distance,
    progress: progress,
  }
}