import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Bike,
  Camera,
  CheckCircle2,
  Clock3,
  DollarSign,
  Eraser,
  LocateFixed,
  MapPin,
  MessageSquareText,
  Navigation,
  PackageCheck,
  Phone,
  RadioTower,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Truck,
  XCircle,
} from "lucide-react";

import { api, currency, getErrorMessage } from "../lib/api";
import { getSocket } from "../lib/socket";
import { useAuthStore } from "../store/authStore";
import TrackingMap from "../components/TrackingMap";

function gpsStorageKey(user) {
  return `lora-gps-${user?._id || user?.id || "worker"}`;
}

function modeFor(user, rider) {
  const role = user?.role || rider?.role;

  if (role === "deliveryBoy") {
    return {
      role: "deliveryBoy",
      label: "Delivery Boy",
      badge: "Local dispatch",
      icon: Bike,
      color: "bg-teal-700",
      soft: "bg-teal-50 text-teal-700",
      radius: "Nearby streets only",
      title: "Nearby Jobs",
      description:
        "Only local paid orders around your current location appear here.",
    };
  }

  return {
    role: "rider",
    label: "Rider",
    badge: "Wide coverage",
    icon: Truck,
    color: "bg-lora-dark",
    soft: "bg-emerald-50 text-lora-green",
    radius: "Short and long distance",
    title: "Available Routes",
    description: "Paid local and long-distance delivery requests appear here.",
  };
}

function workerOnline(rider) {
  return Boolean(rider?.online || rider?.deliveryWorker?.online);
}

function workerStatus(rider) {
  return (
    rider?.status ||
    rider?.deliveryWorker?.status ||
    rider?.deliveryWorker?.availabilityStatus ||
    "offline"
  );
}

function orderAddress(order) {
  return [order?.address?.line1, order?.address?.city, order?.address?.state]
    .filter(Boolean)
    .join(", ");
}

function orderPhone(order) {
  return order?.address?.phone || order?.customer?.phone || "";
}

function nextStageFor(order) {
  if (!order) return null;
  if (order.stage === "Confirmed") return "Preparing";
  if (order.stage === "Preparing") return "Packed";
  if (order.stage === "Packed") return "Picked Up";
  if (order.stage === "Picked Up") return "On The Way";
  if (order.stage === "On The Way") return "Delivered";
  return null;
}

function workerName(rider, user) {
  return rider?.name || rider?.user?.name || user?.name || "Lo'ra worker";
}

function deliveryLabel(order) {
  return order?.deliveryServiceType === "deliveryBoy"
    ? "Local delivery"
    : "Rider route";
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-soft-card">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-lora-green">
        <Icon size={20} />
      </span>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function Pill({ children, tone = "green" }) {
  const styles =
    tone === "dark"
      ? "bg-lora-dark text-white"
      : tone === "red"
        ? "bg-rose-50 text-rose-600"
        : "bg-emerald-50 text-lora-green";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${styles}`}>
      {children}
    </span>
  );
}

function JobCard({ order, onAccept, onReject, accepting, rejecting }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-soft-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-slate-950">{order.orderNumber}</p>
          <p className="mt-1 text-sm font-bold leading-5 text-slate-500">
            {orderAddress(order) || "Customer location"}
          </p>
        </div>

        <Pill>{deliveryLabel(order)}</Pill>
      </div>

      {order.deliveryNotes && (
        <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-bold leading-5 text-amber-700">
          <span className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em]">
            <MessageSquareText size={14} />
            Note
          </span>
          {order.deliveryNotes}
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-400">ETA</p>
          <p className="mt-1 text-xs font-black text-slate-950">
            {order.delivery?.etaMinutes || 35}m
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-400">Distance</p>
          <p className="mt-1 text-xs font-black text-slate-950">
            {typeof order.distanceFromWorkerKm === "number"
              ? `${order.distanceFromWorkerKm}km`
              : order.distanceKm
                ? `${Number(order.distanceKm).toFixed(1)}km`
                : "Nearby"}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-400">Payout</p>
          <p className="mt-1 text-xs font-black text-slate-950">
            {currency(order.deliveryWorkerPayout || 0)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={accepting}
          onClick={() => onAccept(order._id)}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-lora-green text-sm font-black text-white shadow-green-soft transition hover:bg-lora-dark disabled:bg-slate-300"
        >
          <CheckCircle2 size={17} />
          Accept
        </button>

        <button
          type="button"
          disabled={rejecting}
          onClick={() => onReject(order._id)}
          className="grid h-11 w-11 place-items-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:bg-slate-100 disabled:text-slate-400"
          aria-label="Reject order"
        >
          <XCircle size={18} />
        </button>
      </div>
    </motion.article>
  );
}

function ActiveDelivery({
  order,
  nextStage,
  onStage,
  onProof,
  stageLoading,
  proofLoading,
}) {
  if (!order) {
    return (
      <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-soft-card">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-lora-green">
          <PackageCheck size={26} />
        </div>

        <h2 className="mt-4 text-2xl font-black text-slate-950">
          No active delivery
        </h2>

        <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
          Go online, keep GPS active, and accept a paid order.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-soft-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-lora-green">
            Active Delivery
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            {order.orderNumber}
          </h2>
          <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
            {orderAddress(order)}
          </p>
        </div>

        <Pill tone="dark">{order.stage}</Pill>
      </div>

      <div className="mt-5 grid gap-3">
        {orderPhone(order) && (
          <a
            href={`tel:${orderPhone(order)}`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-50 text-sm font-black text-lora-green transition hover:bg-emerald-100"
          >
            <Phone size={17} />
            Call customer
          </a>
        )}

        {order.deliveryNotes && (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-700">
            <span className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em]">
              <MessageSquareText size={14} />
              Delivery message
            </span>
            {order.deliveryNotes}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={!nextStage || stageLoading}
            onClick={() =>
              nextStage && onStage({ id: order._id, stage: nextStage })
            }
            className="h-12 rounded-full bg-lora-green text-sm font-black text-white shadow-green-soft transition hover:bg-lora-dark disabled:bg-slate-300"
          >
            {nextStage ? `Move to ${nextStage}` : "Complete"}
          </button>

          <button
            type="button"
            disabled={proofLoading}
            onClick={() => onProof(order._id)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-lora-dark text-sm font-black text-white transition hover:bg-lora-green disabled:bg-slate-300"
          >
            <Camera size={17} />
            Mark delivered
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RiderDashboard() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [gpsOn, setGpsOn] = useState(() => {
    return localStorage.getItem(gpsStorageKey(user)) === "on";
  });
  const [gpsError, setGpsError] = useState("");
  const [actionError, setActionError] = useState("");
  const [liveLocation, setLiveLocation] = useState(null);

  const me = useQuery({
    queryKey: ["rider-me"],
    queryFn: async () => {
      const { data } = await api.get("/riders/me");
      return data.rider;
    },
  });

  const orders = useQuery({
    queryKey: ["rider-orders"],
    queryFn: async () => {
      const { data } = await api.get("/riders/orders");
      return data;
    },
    refetchInterval: 8000,
  });

  const rider = me.data;
  const mode = modeFor(user, rider);
  const ModeIcon = mode.icon;

  const assigned = orders.data?.assigned?.[0] || null;
  const openJobs = orders.data?.open || [];
  const history = orders.data?.history || [];
  const nextStage = useMemo(() => nextStageFor(assigned), [assigned]);

  const online = workerOnline(rider);
  const status = workerStatus(rider);

  const availability = useMutation({
    mutationFn: async (nextOnline) => {
      const { data } = await api.patch("/riders/availability", {
        online: nextOnline,
      });

      return data.rider;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rider-me"] });
      queryClient.invalidateQueries({ queryKey: ["rider-orders"] });
    },
    onError: (err) =>
      setActionError(getErrorMessage(err, "Could not update availability.")),
  });

  const accept = useMutation({
    mutationFn: async (id) => {
      const { data } = await api.post(`/riders/orders/${id}/accept`);
      return data;
    },
    onSuccess: () => {
      setGpsOn(true);
      localStorage.setItem(gpsStorageKey(user), "on");
      queryClient.invalidateQueries({ queryKey: ["rider-orders"] });
      queryClient.invalidateQueries({ queryKey: ["rider-me"] });
    },
    onError: (err) =>
      setActionError(getErrorMessage(err, "Could not accept order.")),
  });

  const reject = useMutation({
    mutationFn: async (id) => {
      const { data } = await api.post(`/riders/orders/${id}/reject`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rider-orders"] });
      queryClient.invalidateQueries({ queryKey: ["rider-me"] });
    },
    onError: (err) =>
      setActionError(getErrorMessage(err, "Could not reject order.")),
  });

  const stage = useMutation({
    mutationFn: async ({ id, stage }) => {
      const { data } = await api.patch(`/orders/${id}/stage`, {
        stage,
      });

      return data.order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rider-orders"] });
      queryClient.invalidateQueries({ queryKey: ["rider-me"] });
    },
    onError: (err) =>
      setActionError(getErrorMessage(err, "Could not update delivery stage.")),
  });

  const proof = useMutation({
    mutationFn: async (id) => {
      const { data } = await api.post(`/riders/orders/${id}/proof`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rider-orders"] });
      queryClient.invalidateQueries({ queryKey: ["rider-me"] });
    },
    onError: (err) =>
      setActionError(getErrorMessage(err, "Could not complete delivery.")),
  });

  const clearHistory = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete("/riders/history");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rider-orders"] });
      queryClient.invalidateQueries({ queryKey: ["rider-me"] });
    },
    onError: (err) =>
      setActionError(getErrorMessage(err, "Could not clear history.")),
  });

  useEffect(() => {
    localStorage.setItem(gpsStorageKey(user), gpsOn ? "on" : "off");
  }, [gpsOn, user]);

  useEffect(() => {
    const socket = getSocket();

    function refreshOrders() {
      queryClient.invalidateQueries({ queryKey: ["rider-orders"] });
      queryClient.invalidateQueries({ queryKey: ["rider-me"] });
    }

    socket.on("order:update", refreshOrders);

    return () => {
      socket.off("order:update", refreshOrders);
    };
  }, [queryClient]);

  useEffect(() => {
    if (!gpsOn) return undefined;

    if (!navigator.geolocation) {
      setGpsError("GPS is not supported on this device.");
      setGpsOn(false);
      return undefined;
    }

    let lastSentAt = 0;
    let firstUpdateDone = false;

    setGpsError("");

    const sendLocation = async (position) => {
      const now = Date.now();

      if (now - lastSentAt < 4000) return;

      lastSentAt = now;

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const heading = Number(position.coords.heading || 0);

      const payload = {
        lat,
        lng,
        heading,
        ...(assigned?._id ? { orderId: assigned._id } : {}),
      };

      setLiveLocation(payload);

      try {
        await api.post("/riders/location", payload);

        if (!firstUpdateDone) {
          firstUpdateDone = true;
          queryClient.invalidateQueries({ queryKey: ["rider-me"] });
          queryClient.invalidateQueries({ queryKey: ["rider-orders"] });
        }

        if (mode.role === "deliveryBoy") {
          queryClient.invalidateQueries({ queryKey: ["rider-orders"] });
        }
      } catch {
        setGpsError("Location update failed. Check your connection.");
      }
    };

    navigator.geolocation.getCurrentPosition(
      sendLocation,
      () => {
        setGpsError("Allow location permission to use live delivery tracking.");
        setGpsOn(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      },
    );

    const watchId = navigator.geolocation.watchPosition(
      sendLocation,
      () => {
        setGpsError("Allow location permission to use live delivery tracking.");
        setGpsOn(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [gpsOn, assigned?._id, mode.role, queryClient]);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-28 pt-24 sm:px-6 lg:px-8">
      <header className="mb-6 overflow-hidden rounded-[30px] bg-lora-dark text-white shadow-card">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-center gap-4">
            <span
              className={`grid h-16 w-16 place-items-center rounded-3xl ${mode.color} text-white shadow-green-soft`}
            >
              <ModeIcon size={30} />
            </span>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-lora-lime">
                {mode.label}
              </p>

              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                {workerName(rider, user)}
              </h1>

              <p className="mt-2 text-sm font-semibold text-white/65">
                {mode.badge} • {mode.radius}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setGpsOn((value) => !value)}
              className={`inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-black transition ${
                gpsOn ? "bg-lora-green text-white" : "bg-white/10 text-white"
              }`}
            >
              <LocateFixed size={18} />
              {gpsOn ? "GPS on" : "Start GPS"}
            </button>

            <button
              type="button"
              onClick={() => {
                if (!online && mode.role === "deliveryBoy" && !gpsOn) {
                  setGpsOn(true);
                  setGpsError(
                    "Delivery boys need GPS on to receive nearby jobs. Allow location permission.",
                  );
                  return;
                }

                availability.mutate(!online);
              }}
              disabled={availability.isPending}
              className={`inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-black transition ${
                online ? "bg-lora-green text-white" : "bg-white text-lora-dark"
              }`}
            >
              {online ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              {online ? "Online" : "Go online"}
            </button>
          </div>
        </div>

        <div className="grid gap-2 border-t border-white/10 bg-white/8 px-5 py-4 text-sm font-bold text-white/70 sm:grid-cols-3 sm:px-7">
          <div>Status: {status}</div>
          <div>{mode.description}</div>
          <div>{openJobs.length} open jobs</div>
        </div>
      </header>
      {mode.role === "deliveryBoy" && !gpsOn && (
        <div className="mb-5 rounded-[24px] border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-700">
          Delivery Boy accounts depend on your live location. Turn on GPS so
          Lo'ra can show only nearby local deliveries.
        </div>
      )}
      {(gpsError || actionError) && (
        <div className="mb-5 grid gap-3">
          {gpsError && (
            <p className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
              {gpsError}
            </p>
          )}
          {actionError && (
            <p className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
              {actionError}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Metric
          label="Earnings"
          value={currency(rider?.earningsBalance || 0)}
          icon={DollarSign}
        />
        <Metric
          label="Deliveries"
          value={String(rider?.totalDeliveries || 0)}
          icon={PackageCheck}
        />
        <Metric
          label="Rating"
          value={Number(rider?.ratingAverage || 5).toFixed(1)}
          icon={ShieldCheck}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_390px]">
        <section className="grid gap-6">
          <div className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-soft-card">
            <div className="mb-4 flex items-center justify-between gap-4 px-1">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
                  <Navigation className="text-lora-green" size={20} />
                  Live Route
                </h2>

                <p className="mt-1 text-xs font-bold text-slate-400">
                  {assigned
                    ? "Your position, customer location, and delivery path."
                    : "Accept an order to show the live route."}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  gpsOn
                    ? "bg-emerald-50 text-lora-green"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {gpsOn ? "Live GPS" : "GPS off"}
              </span>
            </div>

            {assigned ? (
              <TrackingMap order={assigned} riderLocation={liveLocation} />
            ) : (
              <div className="flex h-[430px] items-center justify-center rounded-[24px] bg-slate-50 text-center">
                <div className="px-5">
                  <MapPin className="mx-auto text-lora-green" size={34} />
                  <p className="mt-3 font-black text-slate-950">
                    No active route
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    Go online and accept a paid delivery to start navigation.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-soft-card">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-black text-slate-950">
                  <RadioTower className="text-lora-green" />
                  {mode.title}
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  {mode.description}
                </p>
              </div>

              <Pill>
                {mode.role === "deliveryBoy"
                  ? `${openJobs.length} nearby`
                  : `${openJobs.length} open`}
              </Pill>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {orders.isLoading ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 md:col-span-2">
                  Loading delivery jobs...
                </p>
              ) : (
                openJobs.map((order) => (
                  <JobCard
                    key={order._id}
                    order={order}
                    onAccept={accept.mutate}
                    onReject={reject.mutate}
                    accepting={accept.isPending}
                    rejecting={reject.isPending}
                  />
                ))
              )}

              {!orders.isLoading && openJobs.length === 0 && (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 md:col-span-2">
                  {mode.role === "deliveryBoy"
                    ? "No nearby paid delivery jobs right now. Keep GPS on and stay online."
                    : "No paid jobs available right now."}
                </p>
              )}
            </div>
          </div>
        </section>

        <aside className="grid h-fit gap-6">
          <ActiveDelivery
            order={assigned}
            nextStage={nextStage}
            onStage={stage.mutate}
            onProof={proof.mutate}
            stageLoading={stage.isPending}
            proofLoading={proof.isPending}
          />

          <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-soft-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-black text-slate-950">
                  <Clock3 className="text-lora-green" />
                  History
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Completed, cancelled, and refunded deliveries.
                </p>
              </div>

              <button
                type="button"
                disabled={clearHistory.isPending || history.length === 0}
                onClick={() => clearHistory.mutate()}
                className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Clear history"
              >
                <Eraser size={17} />
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {history.map((order) => (
                <div key={order._id} className="rounded-2xl bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">
                        {order.orderNumber}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        {currency(order.totals?.total || order.total || 0)}
                      </p>
                    </div>
                    <Pill tone={order.stage === "Delivered" ? "green" : "red"}>
                      {order.stage}
                    </Pill>
                  </div>
                </div>
              ))}

              {history.length === 0 && (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                  Delivery history is empty.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
