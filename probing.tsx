import React, { useEffect, useRef } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import GeoTIFF from "ol/source/GeoTIFF";
import { fromLonLat, toLonLat } from "ol/proj";

const GeoTIFFMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const tiffSource = new GeoTIFF({
      sources: [
        {
          url: "https://your-cog-link.tif", // Replace with your actual COG URL
        },
      ],
    });

    const geoTiffLayer = new TileLayer({
      source: tiffSource,
    });

    const map = new Map({
      target: mapRef.current,
      layers: [geoTiffLayer],
      view: new View({
        center: fromLonLat([78.9629, 20.5937]), // Center on India
        zoom: 5,
      }),
    });

    mapInstanceRef.current = map;

    map.on("pointermove", async function (evt) {
      const coordinate = evt.coordinate;
      const lonLat = toLonLat(coordinate);

      // Log coordinates
      console.log(`Lat: ${lonLat[1].toFixed(6)}, Lon: ${lonLat[0].toFixed(6)}`);

      // Probe pixel value
      const view = map.getView();
      const resolution = view.getResolution()!;
      const projection = view.getProjection();

      try {
        const pixelData = await tiffSource.getView().sample(coordinate, resolution, projection);
        console.log("Probed Pixel Value:", pixelData); // Example: [value1, value2, ...]
      } catch (err) {
        console.error("Error probing GeoTIFF:", err);
      }
    });

    return () => map.setTarget(null); // Cleanup
  }, []);

  return <div ref={mapRef} style={{ width: "100%", height: "500px" }} />;
};

export default GeoTIFFMap;
