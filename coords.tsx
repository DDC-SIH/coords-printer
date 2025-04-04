import React, { useEffect, useRef } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat, toLonLat } from "ol/proj";

const MapComponent: React.FC = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      view: new View({
        center: fromLonLat([78.9629, 20.5937]), // India's center
        zoom: 4,
      }),
    });

    // Store map instance
    mapInstanceRef.current = map;

    // Add pointer move event
    map.on("pointermove", function (evt) {
      const coords = toLonLat(evt.coordinate); // [lon, lat]
      const [lon, lat] = coords;
      console.log(`Latitude: ${lat.toFixed(6)}, Longitude: ${lon.toFixed(6)}`);
    });

    return () => map.setTarget(null); // Cleanup on unmount
  }, []);

  return <div ref={mapRef} style={{ width: "100%", height: "500px" }} />;
};

export default MapComponent;
