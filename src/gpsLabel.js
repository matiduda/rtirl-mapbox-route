class GPSLabel {
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

    wasHighlighted = false;

    constructor(coords) {
        this.name = "Tu jesteśmy";
        this.latitude = coords.latitude;
        this.longitude = coords.longitude;

        this.element = document.createElement("div");
        this.element.className = "gps-label-wrapper";

        this.pointer = document.createElement("div");
        this.pointer.className = "gps-label-pointer";
        this.element.appendChild(this.pointer);

        this.background = document.createElement("div");
        this.background.className = "gps-label-background";

        this.text = document.createElement("div");
        this.text.textContent = this.name.toLocaleUpperCase();
        this.text.className = "gps-label-text";
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
        this.background.className += " gps-label-background-highlighted";
        this.text.className += " gps-label-text-highlighted";
        this.pointer.className += " gps-label-pointer-highlighted";
        this.wasHighlighted = true;
    }

    get highlighted() {
        return this.wasHighlighted;
    }
}

export default GPSLabel;