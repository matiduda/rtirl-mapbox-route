class CityLabel {
    name;

    // Wrapper element
    element;

    // Children
    pointer;
    background;
    text;

    // Map marker
    marker;

    // Map lat / lng
    latitude;
    longitude;

    // Closest point from GPX route
    closestPointInfo

    wasHighlighted = false;

    constructor(waypoint, closestPointInfo) {
        this.name = waypoint.name;
        this.latitude = waypoint.latitude;
        this.longitude = waypoint.longitude;
        this.closestPointInfo = closestPointInfo;

        this.element = document.createElement("div");
        this.element.className = "city-label-wrapper";

        this.pointer = document.createElement("div");
        this.pointer.className = "city-label-pointer";
        this.element.appendChild(this.pointer);

        this.background = document.createElement("div");
        this.background.className = "city-label-background";

        this.text = document.createElement("div");
        this.text.textContent = this.name.toLocaleUpperCase();
        this.text.className = "city-label-text";
        this.background.appendChild(this.text);

        this.element.appendChild(this.background);
    }

    setMarker(marker) {
        this.marker = marker;
    }

    highlight() {
        if (this.wasHighlighted) {
            console.log("Cannot highlight " + this.name + " more than once!");
            return;
        }
        this.background.className += " city-label-background-highlighted";
        this.text.className += " city-label-text-highlighted";
        this.pointer.className += " city-label-pointer-highlighted";
        this.wasHighlighted = true;
    }

    get highlighted() {
        return this.wasHighlighted;
    }
}

export default CityLabel;