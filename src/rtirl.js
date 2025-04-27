import * as RealtimeIRL from '@rtirl/api';
import { upadteRTIRLLocation } from "./map"
// TODO: Hide
const YOUR_PULL_KEY = "3el32o8u9y1fy5ae";

RealtimeIRL.forPullKey(YOUR_PULL_KEY).addLocationListener(function (location) {
  console.log("Got location update from RTIRL: ", location);
  upadteRTIRLLocation(location);
});
