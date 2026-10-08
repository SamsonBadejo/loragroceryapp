import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap
} from "react-leaflet";
import L from "leaflet";
import { Bike, Home, Navigation, Store, Truck } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

const STORE_COORDINATES = [3.3792, 6.5244];
const DEFAULT_CUSTOMER_COORDINATES = [3.4723, 6.4474];
const DEFAULT_WORKER_COORDINATES = [3.4301, 6.4422];

function isValidLngLat(value) {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isFinite(Number(value[0])) &&
    Number.isFinite(Number(value[1]))
  );
}

function coordinatesFromPoint(point, fallback) {
  if (isValidLngLat(point)) {
    return [Number(point[0]), Number(point[1])];
  }

  if (isValidLngLat(point?.coordinates)) {
    return [Number(point.coordinates[0]), Number(point.coordinates[1])];
  }

  if (
    Number.isFinite(Number(point?.lng)) &&
    Number.isFinite(Number(point?.lat))
  ) {
    return [Number(point.lng), Number(point.lat)];
  }

  return fallback;
}

function lngLatToLatLng(point) {
  return [Number(point[1]), Number(point[0])];
}

function getCustomerCoordinates(order) {
  return coordinatesFromPoint(
    order?.address?.location,
    order?.address?.location?.coordinates || DEFAULT_CUSTOMER_COORDINATES
  );
}

function getWorkerCoordinates(order, riderLocation) {
  if (
    Number.isFinite(Number(riderLocation?.lng)) &&
    Number.isFinite(Number(riderLocation?.lat))
  ) {
    return [Number(riderLocation.lng), Number(riderLocation.lat)];
  }

  if (isValidLngLat(riderLocation?.coordinates)) {
    return riderLocation.coordinates;
  }

  if (isValidLngLat(riderLocation?.location?.coordinates)) {
    return riderLocation.location.coordinates;
  }

  return coordinatesFromPoint(
    order?.delivery?.riderLocation,
    order?.delivery?.riderLocation?.coordinates || DEFAULT_WORKER_COORDINATES
  );
}

function getRoute(order, worker, customer) {
  const route = order?.delivery?.route;

  if (Array.isArray(route) && route.length >= 2) {
    const cleanRoute = route.filter(isValidLngLat);

    if (cleanRoute.length >= 2) {
      return cleanRoute;
    }
  }

  return [STORE_COORDINATES, worker, customer].filter(isValidLngLat);
}

function workerLabel(order) {
  return order?.deliveryServiceType === "deliveryBoy" ? "Delivery Boy" : "Rider";
}

function makeIcon({ type, color = "#16A34A", bg = "#ffffff" }) {
  const Icon =
    type === "store"
      ? Store
      : type === "customer"
        ? Home
        : type === "deliveryBoy"
          ? Bike
          : Truck;

  const html = renderToStaticMarkup(
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: 16,
        display: "grid",
        placeItems: "center",
        color,
        background: bg,
        boxShadow: "0 14px 30px rgba(20,83,45,.22)",
        border: "2px solid rgba(255,255,255,.95)"
      }}
    >
      <Icon size={21} />
    </div>
  );

  return L.divIcon({
    html,
    className: "lora-map-marker",
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -18]
  });
}

function FitBounds({ route }) {
  const map = useMap();

  useEffect(() => {
    if (!route.length) return;

    const bounds = L.latLngBounds(route.map(lngLatToLatLng));

    map.invalidateSize();

    window.setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 16
      });
    }, 100);
  }, [map, route]);

  return null;
}

function ResizeMap() {
  const map = useMap();

  useEffect(() => {
    const resize = () => map.invalidateSize();

    resize();
    window.setTimeout(resize, 150);
    window.addEventListener("resize", resize);

    return () => window.removeEventListener("resize", resize);
  }, [map]);

  return null;
}

export default function TrackingMap({ order, riderLocation }) {
  const customer = useMemo(() => getCustomerCoordinates(order), [order]);

  const worker = useMemo(
    () => getWorkerCoordinates(order, riderLocation),
    [order, riderLocation]
  );

  const route = useMemo(
    () => getRoute(order, worker, customer),
    [order, worker, customer]
  );

  const leafletRoute = useMemo(() => route.map(lngLatToLatLng), [route]);
  const customerLatLng = useMemo(() => lngLatToLatLng(customer), [customer]);
  const workerLatLng = useMemo(() => lngLatToLatLng(worker), [worker]);
  const storeLatLng = useMemo(() => lngLatToLatLng(STORE_COORDINATES), []);

  const workerType =
    order?.deliveryServiceType === "deliveryBoy" ? "deliveryBoy" : "rider";

  const storeIcon = useMemo(
    () => makeIcon({ type: "store", color: "#14532D", bg: "#ECFDF5" }),
    []
  );

  const customerIcon = useMemo(
    () => makeIcon({ type: "customer", color: "#ffffff", bg: "#16A34A" }),
    []
  );

  const workerIcon = useMemo(
    () =>
      makeIcon({
        type: workerType,
        color: "#ffffff",
        bg: workerType === "deliveryBoy" ? "#0F766E" : "#14532D"
      }),
    [workerType]
  );

  return (
    <div className="relative min-h-[430px] overflow-hidden rounded-[28px] bg-slate-100 shadow-card">
      <MapContainer
        center={workerLatLng}
        zoom={13}
        scrollWheelZoom
        className="z-0 h-[430px] min-h-[430px] w-full"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ResizeMap />
        <FitBounds route={route} />

        {leafletRoute.length >= 2 && (
          <Polyline
            positions={leafletRoute}
            pathOptions={{
              color: "#16A34A",
              weight: 5,
              opacity: 0.85
            }}
          />
        )}

        <CircleMarker
          center={workerLatLng}
          radius={18}
          pathOptions={{
            color: "#16A34A",
            fillColor: "#16A34A",
            fillOpacity: 0.16,
            weight: 2
          }}
        />

        <Marker position={storeLatLng} icon={storeIcon}>
          <Popup>Lo&apos;ra store</Popup>
        </Marker>

        <Marker position={customerLatLng} icon={customerIcon}>
          <Popup>Customer location</Popup>
        </Marker>

        <Marker position={workerLatLng} icon={workerIcon}>
          <Popup>{workerLabel(order)} location</Popup>
        </Marker>
      </MapContainer>

      <div className="pointer-events-none absolute left-4 top-4 z-[500] rounded-2xl bg-white/95 px-4 py-3 shadow-card backdrop-blur">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-lora-green">
          <Navigation size={14} />
          Live map
        </p>
        <p className="mt-1 text-sm font-black text-lora-dark">
          {workerLabel(order)} location
        </p>
      </div>
    </div>
  );
}