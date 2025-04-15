import * as RealtimeIRL from '@rtirl/api';

// TODO: Hide
const YOUR_PULL_KEY = "3el32o8u9y1fy5ae";

export function setLocationListener(map) {
  let gpsLocationMarker;

  RealtimeIRL.forPullKey(YOUR_PULL_KEY).addLocationListener(function (location) {
    console.log(location);

    if (!gpsLocationMarker) {
      gpsLocationMarker = new L.marker([location.latitude, location.longitude]).addTo(map);
      return;
    }

    const newLatLng = new L.LatLng(location.latitude, location.longitude);
    gpsLocationMarker.setLatLng(newLatLng);
  });
}
