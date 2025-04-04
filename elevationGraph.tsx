import React, { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import GeoTIFF from "ol/source/GeoTIFF";
import { fromLonLat, toLonLat } from "ol/proj";
import { Feature } from "ol";
import Point from "ol/geom/Point";
import LineString from "ol/geom/LineString";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Icon, Stroke, Style } from "ol/style";
import Overlay from "ol/Overlay";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const GeoTIFFMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [pinData, setPinData] = useState<{ lat: number; lon: number; value: number | null; id: number }[]>([]);
  const vectorSourceRef = useRef<VectorSource>(new VectorSource());
  const [linePoints, setLinePoints] = useState<number[][]>([]);
  const [elevationProfile, setElevationProfile] = useState<{ distance: number; elevation: number }[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    const tiffSource = new GeoTIFF({
      sources: [{ url: "https://your-cog-link.tif" }], // Replace with your GeoTIFF URL
    });

    const geoTiffLayer = new TileLayer({ source: tiffSource });

    const markerLayer = new VectorLayer({
      source: vectorSourceRef.current,
      style: new Style({
        image: new Icon({
          src: "https://cdn-icons-png.flaticon.com/512/684/684908.png", // Pin icon
          scale: 0.05,
        }),
      }),
    });

    const newMap = new Map({
      target: mapRef.current!,
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
      const view = newMap.getView();
      const resolution = view.getResolution()!;
      const projection = view.getProjection();

      try {
        const pixelData = await tiffSource.getView().sample(coordinate, resolution, projection);
        const value = pixelData?.[0] ?? null;

        // Store pin data
        const newPin = {
          lat: lonLat[1],
          lon: lonLat[0],
          value,
          id: Date.now(),
        };
        setPinData((prev) => [...prev, newPin]);

        // Add pin to map
        const pinFeature = new Feature(new Point(coordinate));
        pinFeature.setId(newPin.id);
        vectorSourceRef.current.addFeature(pinFeature);
      } catch (err) {
        console.error("Error sampling GeoTIFF:", err);
      }
    });

    return () => {
      newMap.setTarget(null);
    };
  }, []);

  // Remove a pin by clicking on it in the sidebar
  const removePin = (id: number) => {
    setPinData((prev) => prev.filter((pin) => pin.id !== id));
    const feature = vectorSourceRef.current.getFeatureById(id);
    if (feature) vectorSourceRef.current.removeFeature(feature);
  };

  // Handle elevation profile drawing
  useEffect(() => {
    if (!map) return;

    const drawLine = new VectorSource();
    const lineLayer = new VectorLayer({
      source: drawLine,
      style: new Style({
        stroke: new Stroke({ color: "red", width: 2 }),
      }),
    });

    map.addLayer(lineLayer);

    let tempPoints: number[][] = [];
    map.on("click", async (evt) => {
      const coordinate = evt.coordinate;
      const lonLat = toLonLat(coordinate);
      const view = map.getView();
      const resolution = view.getResolution()!;
      const projection = view.getProjection();

      try {
        const pixelData = await (map.getLayers().item(0).getSource() as GeoTIFF)
          .getView()
          .sample(coordinate, resolution, projection);
        const value = pixelData?.[0] ?? null;

        tempPoints.push([...lonLat, value]);
        setLinePoints(tempPoints);

        if (tempPoints.length > 1) {
          const lineFeature = new Feature(new LineString(tempPoints.map((p) => fromLonLat([p[0], p[1]]))));
          drawLine.clear();
          drawLine.addFeature(lineFeature);

          // Generate elevation profile
          const profileData = tempPoints.map((p, index) => ({
            distance: index * 10, // Just an approximation
            elevation: p[2] || 0,
          }));
          setElevationProfile(profileData);
        }
      } catch (err) {
        console.error("Error sampling for elevation:", err);
      }
    });

    return () => {
      map.removeLayer(lineLayer);
    };
  }, [map]);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Map Container */}
      <div ref={mapRef} style={{ flex: 3, height: "100%" }} />

      {/* Sidebar for Pin History */}
      <div style={{ flex: 1, padding: "10px", borderLeft: "1px solid #ccc", overflowY: "auto" }}>
        <h3>📍 Clicked Locations</h3>
        {pinData.length === 0 ? <p>No pins yet.</p> : null}
        {pinData.map((pin) => (
          <div key={pin.id} style={{ marginBottom: "10px", padding: "8px", background: "#f8f8f8", borderRadius: "5px" }}>
            <p><strong>Lat:</strong> {pin.lat.toFixed(5)}</p>
            <p><strong>Lon:</strong> {pin.lon.toFixed(5)}</p>
            <p><strong>Value:</strong> {pin.value ?? "N/A"}</p>
            <button onClick={() => removePin(pin.id)} style={{ background: "red", color: "white", border: "none", padding: "4px 6px", cursor: "pointer" }}>
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Elevation Profile Chart */}
      <div style={{ flex: 1, padding: "10px", borderLeft: "1px solid #ccc" }}>
        <h3>📊 Elevation Profile</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={elevationProfile}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="distance" label={{ value: "Distance", position: "insideBottom" }} />
            <YAxis label={{ value: "Elevation", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Line type="monotone" dataKey="elevation" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default GeoTIFFMap;
