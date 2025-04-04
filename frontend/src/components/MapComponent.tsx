import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for marker icon issue in React Leaflet
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Different icon types with colors that match UI sections
const mainIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41],
});

const hospitalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41],
});

const fireIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41],
});

const policeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41],
});

const restaurantIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41],
});

const entertainmentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41],
});

const parkIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41],
});

const schoolIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41],
});

const groceryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41],
});

interface NearbyPlace {
  name: string;
  type?: string;
  address: string;
  lat: number;
  lng: number;
  distance?: number;
  rating?: number;
}

// Component to automatically recenter the map when coordinates change
function RecenterAutomatically({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView([lat, lng], 15);
  }, [lat, lng, map]);
  
  return null;
}

interface MapComponentProps {
  latitude: number;
  longitude: number;
  address: string;
  nearbyPlaces?: NearbyPlace[];
  analysisResults?: any;
}

export const MapComponent: React.FC<MapComponentProps> = ({ 
  latitude, 
  longitude, 
  address,
  nearbyPlaces = [] 
}) => {
  
  // Get icon based on place type - color-coordinated with UI sections
  const getMarkerIcon = (type: string = '') => {
    switch(type.toLowerCase()) {
      case 'hospital':
        return hospitalIcon;
      case 'fire':
        return fireIcon;
      case 'police':
        return policeIcon;
      case 'entertainment':
        return entertainmentIcon;
      case 'restaurant':
        return restaurantIcon;
      case 'park':
        return parkIcon;
      case 'school':
        return schoolIcon;
      case 'grocery':
        return groceryIcon;
      default:
        return new L.Icon.Default();
    }
  };

  return (
    <MapContainer 
      center={[latitude, longitude]} 
      zoom={15} 
      scrollWheelZoom={true}
      style={{ height: '600px', width: '100%', borderRadius: '8px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Main marker for the searched address */}
      <Marker position={[latitude, longitude]} icon={mainIcon}>
        <Popup>
          <strong>{address}</strong>
          <p>Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}</p>
        </Popup>
      </Marker>
      
      {/* Nearby places markers with color-coded icons */}
      {nearbyPlaces.map((place, index) => (
        <Marker 
          key={index} 
          position={[place.lat, place.lng]} 
          icon={getMarkerIcon(place.type || '')}
        >
          <Popup>
            <strong>{place.name}</strong>
            <p>{place.address}</p>
            {place.distance && <p>Distance: {(place.distance / 1000).toFixed(2)} km</p>}
            {place.rating && <p>Rating: {place.rating}/5</p>}
          </Popup>
        </Marker>
      ))}
      
      {/* This component ensures the map recenters when coordinates change */}
      <RecenterAutomatically lat={latitude} lng={longitude} />
    </MapContainer>
  );
};

export default MapComponent; 