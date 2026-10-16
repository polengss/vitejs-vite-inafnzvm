
import { MapContainer, TileLayer, ZoomControl, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './CampusMap.css';

const campusPosition: [number, number] = [14.259832, 121.133720];

const campusIcon = L.divIcon({
  className: 'findit-campus-marker',
  html: '<div class="findit-pin">📍</div>',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -35],
});

export default function CampusMap() {
  return (
    <div className="findit-campus-map">
      <MapContainer
        center={campusPosition}
        zoom={17}
        minZoom={11}
        maxZoom={19}
        zoomControl={false}
        scrollWheelZoom={false}
        className="findit-leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <Marker position={campusPosition} icon={campusIcon}>
          <Popup>
            <strong>University of Cabuyao</strong>
            <p>FindIt — Campus Lost & Found</p>
          </Popup>
        </Marker>

        <ZoomControl position="bottomright" />
      </MapContainer>
    </div>
  );
}
