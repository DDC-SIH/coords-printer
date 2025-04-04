import React, { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import GeoTIFF from "ol/source/GeoTIFF";
import { fromLonLat, toLonLat } from "ol/proj";
import { Icon, Style } from "ol/style";
import { Feature } from "ol";
import Point from "ol/geom/Point";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Overlay from "ol/Overlay";

const GeoTIFFMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource>(new VectorSource());

  useEffect(() => {
    if (!mapRef.current) return;

    const tiffSource = new GeoTIFF({
      sources: [
        {
          url: "https://your-cog-link.tif", // replace with your actual COG url
        },
      ],
    });

    const geoTiffLayer = new TileLayer({ source: tiffSource });

    const markerLayer = new VectorLayer({
      source: vectorSourceRef.current,
      style: new Style({
        image: new Icon({
          src: "https://cdn-icons-png.flaticon.com/512/684/684908.png", // simple pin icon
          scale: 0.05,
        }),
      }),
    });

    const newMap = new Map({
      target: mapRef.current,
      layers: [geoTiffLayer, markerLayer],
      view: new View({
        center: fromLonLat([78.9629, 20.5937]),
        zoom: 5,
      }),
    });

    setMap(newMap);

    const overlay = new Overlay({
      element: overlayRef.current!,
      positioning: "bottom-center",
      offset: [0, -10],
    });
    newMap.addOverlay(overlay);

    newMap.on("click", async (evt) => {
      const coordinate = evt.coordinate;
      const lonLat = toLonLat(coordinate);

      // Get pixel value at clicked coordinate
      const view = newMap.getView();
      const resolution = view.getResolution()!;
      const projection = view.getProjection();

      try {
        const pixelData = await tiffSource.getView().sample(coordinate, resolution, projection);

        // Clear old markers
        vectorSourceRef.current.clear();

        // Add pin
        const pin = new Feature(new Point(coordinate));
        vectorSourceRef.current.addFeature(pin);

        // Show overlay text
        if (overlayRef.current) {
          overlayRef.current.innerHTML = `
            <div style="background: white; padding: 6px 10px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.15); font-size: 14px;">
              <strong>Lat:</strong> ${lonLat[1].toFixed(5)}<br/>
              <strong>Lon:</strong> ${lonLat[0].toFixed(5)}<br/>
              <strong>Value:</strong> ${pixelData?.[0]?.toFixed?.(2) ?? "N/A"}
            </div>
          `;
          overlay.setPosition(coordinate);
        }
      } catch (err) {
        console.error("Error sampling GeoTIFF:", err);
      }
    });

    return () => {
      newMap.setTarget(null);
    };
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <div ref={mapRef} style={{ width: "100%", height: "600px" }} />
      <div ref={overlayRef} />
    </div>
  );
};

export default GeoTIFFMap;
