import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bike,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  MapPin,
  MessageSquareText,
  PackageCheck,
  Phone,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Truck
} from "lucide-react";

import TrackingMap from "../components/TrackingMap";
import { api, currency, getErrorMessage } from "../lib/api";
import { getSocket } from "../lib/socket";

const stages = [
  "Pending",
  "Confirmed",
  "Preparing",
  "Packed",
  "Picked Up",
  "On The Way",
  "Delivered"
];

function workerLabel(order) {
  return order?.deliveryServiceType === "deliveryBoy" ? "Delivery Boy" : "Rider";
}

function workerIcon(order) {
  return order?.deliveryServiceType === "deliveryBoy" ? Bike : Truck;
}

function getWorker(order) {
  return order?.assignedRider || order?.rider || null;
}

function getWorkerName(order) {
  const worker = getWorker(order);

  return worker?.name || `${workerLabel(order)} not assigned yet`;
}

function getWorkerPhone(order) {
  const worker = getWorker(order);
  return worker?.phone || "";
}

function stageIndex(stage) {
  return Math.max(stages.indexOf(stage), 0);
}

function isPaid(order) {
  return order?.paymentStatus === "paid";
}

function isFinished(order) {
  return ["Delivered", "Cancelled", "Refunded"].includes(order?.stage);
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[22px] bg-white p-4 shadow-soft-card ring-1 ring-slate-100">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-lora-green">
        <Icon size={18} />
      </span>

      <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function Timeline({ stage }) {
  const current = stageIndex(stage);

  return (
    <div className="rounded-[28px] bg-white p-5 shadow-soft-card ring-1 ring-slate-100">
      <h2 className="text-xl font-black text-slate-950">Delivery progress</h2>

      <div className="mt-5 grid gap-4">
        {stages.map((item, index) => {
          const active = index <= current;
          const currentStage = index === current;

          return (
            <div key={item} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full ${
                    active
                      ? "bg-lora-green text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <CheckCircle2 size={16} />
                </span>

                {index < stages.length - 1 && (
                  <span
                    className={`mt-1 h-8 w-1 rounded-full ${
                      index < current ? "bg-lora-green" : "bg-slate-100"
                    }`}
                  />
                )}
              </div>

              <div className="pb-2">
                <p
                  className={`text-sm font-black ${
                    currentStage ? "text-lora-green" : "text-slate-950"
                  }`}
                >
                  {item}
                </p>

                <p className="mt-1 text-xs font-bold text-slate-400">
                  {currentStage ? "Current stage" : active ? "Completed" : "Waiting"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WorkerCard({ order }) {
  const Icon = workerIcon(order);
  const phone = getWorkerPhone(order);
  const worker = getWorker(order);

  return (
    <div className="rounded-[28px] bg-white p-5 shadow-soft-card ring-1 ring-slate-100">
      <div className="flex items-start gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-lora-dark text-white">
          <Icon size={26} />
        </span>

        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-lora-green">
            {workerLabel(order)}
          </p>

          <h2 className="mt-1 truncate text-xl font-black text-slate-950">
            {getWorkerName(order)}
          </h2>

          <p className="mt-1 text-sm font-bold text-slate-500">
            {worker ? "Assigned to your order" : "Waiting for assignment"}
          </p>
        </div>
      </div>

      {phone && (
        <a
          href={`tel:${phone}`}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-50 text-sm font-black text-lora-green"
        >
          <Phone size={17} />
          Call {workerLabel(order)}
        </a>
      )}
    </div>
  );
}

function EmptyTracking() {
  return (
    <main className="mx-auto max-w-4xl px-4 pb-28 pt-24 sm:px-6 lg:px-8">
      <section className="rounded-[30px] bg-white p-8 text-center shadow-soft-card ring-1 ring-slate-100">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-lora-green">
          <MapPin size={30} />
        </div>

        <h1 className="mt-5 text-3xl font-black text-slate-950">
          No tracking yet
        </h1>

        <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-6 text-slate-500">
          Once you place and pay for an order, live tracking will appear here.
        </p>

        <Link
          to="/products"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-lora-green px-6 text-sm font-black text-white shadow-green-soft"
        >
          Start shopping
        </Link>
      </section>
    </main>
  );
}

export default function Tracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [paymentError, setPaymentError] = useState("");
  const [paying, setPaying] = useState(false);

  const latestOrderQuery = useQuery({
    queryKey: ["latest-order-for-tracking"],
    enabled: !orderId,
    queryFn: async () => {
      const { data } = await api.get("/orders", {
        params: {
          limit: 1
        }
      });

      return data.orders?.[0] || null;
    }
  });

  const orderQuery = useQuery({
    queryKey: ["tracking-order", orderId],
    enabled: Boolean(orderId),
    queryFn: async () => {
      const { data } = await api.get(`/orders/${orderId}`);
      return data.order || data;
    }
  });

  useEffect(() => {
    if (!orderId && latestOrderQuery.data?._id) {
      navigate(`/tracking/${latestOrderQuery.data._id}`, { replace: true });
    }
  }, [latestOrderQuery.data, navigate, orderId]);

  useEffect(() => {
    if (orderQuery.data) {
      setOrder(orderQuery.data);
    }
  }, [orderQuery.data]);

  useEffect(() => {
    if (!order?._id) return undefined;

    const socket = getSocket();

    socket.emit("order:join", order._id);

    function handleOrderUpdate(payload) {
      const nextOrder = payload?.order || payload;

      if (String(nextOrder?._id) === String(order._id)) {
        setOrder(nextOrder);
      }
    }

    function handleRiderLocation(payload) {
      if (!payload?.orderId || String(payload.orderId) === String(order._id)) {
        setRiderLocation(payload);
      }
    }

    socket.on("order:update", handleOrderUpdate);
    socket.on("rider:location", handleRiderLocation);

    return () => {
      socket.off("order:update", handleOrderUpdate);
      socket.off("rider:location", handleRiderLocation);
    };
  }, [order?._id]);

  async function retryPayment() {
    if (!order?._id) return;

    setPaying(true);
    setPaymentError("");

    try {
      const callbackUrl = `${window.location.origin}/payment/callback`;

      const { data } = await api.post("/payments/paystack/initialize", {
        orderId: order._id,
        callbackUrl
      });

      if (!data.authorizationUrl) {
        throw new Error("Paystack authorization URL was not returned.");
      }

      window.location.href = data.authorizationUrl;
    } catch (err) {
      setPaymentError(getErrorMessage(err, "Could not restart payment."));
    } finally {
      setPaying(false);
    }
  }

  const loading =
    latestOrderQuery.isLoading || orderQuery.isLoading || (!orderId && !latestOrderQuery.data);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-24 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="h-[500px] animate-pulse rounded-[30px] bg-white" />
          <div className="h-[500px] animate-pulse rounded-[30px] bg-white" />
        </div>
      </main>
    );
  }

  if (!order) {
    return <EmptyTracking />;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-28 pt-24 sm:px-6 lg:px-8">
      <section className="mb-6 overflow-hidden rounded-[30px] bg-lora-dark p-5 text-white shadow-card sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-lora-lime">
          Live tracking
        </p>

        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              {order.orderNumber}
            </h1>

            <p className="mt-2 text-sm font-semibold text-white/65">
              {order.address?.line1}, {order.address?.city}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-black">
              {order.stage}
            </span>

            <span
              className={`rounded-full px-4 py-2 text-sm font-black ${
                isPaid(order)
                  ? "bg-lora-green text-white"
                  : "bg-amber-400 text-slate-950"
              }`}
            >
              {isPaid(order) ? "Paid" : "Payment pending"}
            </span>
          </div>
        </div>
      </section>

      {!isPaid(order) && (
        <div className="mb-6 rounded-[28px] border border-amber-100 bg-amber-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-black text-amber-800">
                <CreditCard size={20} />
                Payment required
              </h2>

              <p className="mt-1 text-sm font-bold leading-6 text-amber-700">
                Delivery tracking starts fully after Paystack confirms payment.
              </p>
            </div>

            <button
              type="button"
              onClick={retryPayment}
              disabled={paying}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-lora-green px-6 text-sm font-black text-white shadow-green-soft disabled:bg-slate-300"
            >
              {paying ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
              Pay now
            </button>
          </div>

          {paymentError && (
            <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
              {paymentError}
            </p>
          )}
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={ReceiptText}
          label="Order total"
          value={currency(order.totals?.total || order.total || 0)}
        />
        <Stat
          icon={Clock3}
          label="ETA"
          value={`${order.delivery?.etaMinutes || 35} mins`}
        />
        <Stat icon={Truck} label="Service" value={workerLabel(order)} />
        <Stat
          icon={ShieldCheck}
          label="Payment"
          value={isPaid(order) ? "Confirmed" : "Pending"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="rounded-[30px] bg-white p-4 shadow-soft-card ring-1 ring-slate-100">
          <TrackingMap order={order} riderLocation={riderLocation} />
        </section>

        <aside className="grid h-fit gap-6">
          <WorkerCard order={order} />

          <Timeline stage={order.stage} />

          {order.deliveryNotes && (
            <div className="rounded-[28px] bg-white p-5 shadow-soft-card ring-1 ring-slate-100">
              <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
                <MessageSquareText size={20} className="text-lora-green" />
                Delivery note
              </h2>

              <p className="mt-3 text-sm font-bold leading-6 text-slate-500">
                {order.deliveryNotes}
              </p>
            </div>
          )}

          <div className="rounded-[28px] bg-white p-5 shadow-soft-card ring-1 ring-slate-100">
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
              <PackageCheck size={20} className="text-lora-green" />
              Items
            </h2>

            <div className="mt-4 grid gap-3">
              {(order.items || []).map((item, index) => (
                <div
                  key={item.product || item._id || index}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {item.quantity} × {currency(item.price)}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-black text-lora-dark">
                    {currency(item.subtotal || item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {isFinished(order) && (
            <Link
              to="/orders"
              className="inline-flex h-13 items-center justify-center rounded-full bg-lora-green px-6 text-sm font-black text-white shadow-green-soft"
            >
              View all orders
            </Link>
          )}
        </aside>
      </div>
    </main>
  );
}