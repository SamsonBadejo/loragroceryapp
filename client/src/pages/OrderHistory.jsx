import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CreditCard,
  Loader2,
  MapPinned,
  MessageSquareWarning,
  PackageCheck,
  ReceiptText,
  Star,
  Truck,
  X
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, currency, getErrorMessage } from "../lib/api";

const ratingDefaults = {
  riderRating: 5,
  packagingRating: 5,
  speedRating: 5,
  productQualityRating: 5,
  comment: ""
};

const stages = [
  "Pending",
  "Confirmed",
  "Preparing",
  "Packed",
  "Picked Up",
  "On The Way",
  "Delivered",
  "Cancelled",
  "Refunded"
];

function stageTone(stage) {
  if (stage === "Delivered") return "bg-emerald-50 text-lora-green";
  if (["Cancelled", "Refunded"].includes(stage)) return "bg-rose-50 text-rose-600";
  if (stage === "Pending") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function workerLabel(order) {
  return order?.deliveryServiceType === "deliveryBoy" ? "Delivery Boy" : "Rider";
}

function orderItemsText(order) {
  const count = order?.items?.reduce((sum, item) => sum + Number(item.quantity || 1), 0) || 0;
  return `${count} ${count === 1 ? "item" : "items"}`;
}

function canRate(order) {
  return order?.stage === "Delivered";
}

function isPaid(order) {
  return order?.paymentStatus === "paid";
}

function isPendingPayment(order) {
  return order?.paymentProvider === "paystack" && order?.paymentStatus !== "paid";
}

function StarInput({ label, value, onChange }) {
  return (
    <div>
      <p className="mb-2 text-sm font-black text-slate-700">{label}</p>

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((number) => (
          <button
            key={number}
            type="button"
            onClick={() => onChange(number)}
            className={`grid h-9 w-9 place-items-center rounded-full transition ${
              number <= value
                ? "bg-amber-100 text-amber-500"
                : "bg-slate-100 text-slate-300"
            }`}
            aria-label={`${label} ${number}`}
          >
            <Star size={17} className={number <= value ? "fill-current" : ""} />
          </button>
        ))}
      </div>
    </div>
  );
}

function RateOrderModal({ order, open, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(ratingDefaults);
  const [error, setError] = useState("");

  const review = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/reviews", {
        orderId: order._id,
        riderRating: form.riderRating,
        packagingRating: form.packagingRating,
        speedRating: form.speedRating,
        productQualityRating: form.productQualityRating,
        comment: form.comment
      });

      return data.review;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onClose();
      setForm(ratingDefaults);
    },
    onError: (err) => {
      setError(getErrorMessage(err, "Review could not be submitted."));
    }
  });

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  return (
    <AnimatePresence>
      {open && order && (
        <motion.div
          className="fixed inset-0 z-[100] bg-slate-950/45 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex min-h-full items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.96 }}
              className="w-full max-w-xl rounded-[30px] bg-white p-5 shadow-card sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-lora-green">
                    Rate delivery
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    {order.orderNumber}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <StarInput
                  label={`${workerLabel(order)} rating`}
                  value={form.riderRating}
                  onChange={(value) => updateField("riderRating", value)}
                />
                <StarInput
                  label="Packaging"
                  value={form.packagingRating}
                  onChange={(value) => updateField("packagingRating", value)}
                />
                <StarInput
                  label="Speed"
                  value={form.speedRating}
                  onChange={(value) => updateField("speedRating", value)}
                />
                <StarInput
                  label="Product quality"
                  value={form.productQualityRating}
                  onChange={(value) => updateField("productQualityRating", value)}
                />
              </div>

              <label className="mt-5 grid gap-2">
                <span className="text-sm font-black text-slate-700">
                  Comment
                </span>
                <textarea
                  value={form.comment}
                  onChange={(event) => updateField("comment", event.target.value)}
                  rows={4}
                  placeholder="Tell us how the delivery went..."
                  className="resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none focus:border-lora-green focus:bg-white"
                />
              </label>

              {error && (
                <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={() => review.mutate()}
                disabled={review.isPending}
                className="mt-5 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-lora-green text-sm font-black text-white shadow-green-soft disabled:bg-slate-300"
              >
                {review.isPending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Star size={18} />
                )}
                Submit rating
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StageMini({ stage }) {
  const activeIndex = stages.indexOf(stage);

  return (
    <div className="mt-4 flex gap-1">
      {stages.slice(0, 7).map((item, index) => (
        <span
          key={item}
          className={`h-1.5 flex-1 rounded-full ${
            index <= activeIndex ? "bg-lora-green" : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

function OrderCard({ order, onRate, onRetryPayment }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] bg-white p-5 shadow-soft-card ring-1 ring-slate-100"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black text-slate-950">
              {order.orderNumber}
            </h2>

            <span className={`rounded-full px-3 py-1 text-xs font-black ${stageTone(order.stage)}`}>
              {order.stage}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${
                isPaid(order)
                  ? "bg-emerald-50 text-lora-green"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {isPaid(order) ? "Paid" : "Payment pending"}
            </span>
          </div>

          <p className="mt-2 text-sm font-bold text-slate-500">
            {orderItemsText(order)} • {workerLabel(order)}
          </p>

          <p className="mt-1 text-sm font-bold text-slate-400">
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Total
          </p>
          <p className="mt-1 text-2xl font-black text-lora-dark">
            {currency(order.totals?.total || order.total || 0)}
          </p>
        </div>
      </div>

      <StageMini stage={order.stage} />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to={`/tracking/${order._id}`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-50 text-sm font-black text-lora-green"
        >
          <MapPinned size={17} />
          Track
        </Link>

        {isPendingPayment(order) && (
          <button
            type="button"
            onClick={() => onRetryPayment(order)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-lora-green text-sm font-black text-white shadow-green-soft"
          >
            <CreditCard size={17} />
            Pay now
          </button>
        )}

        {canRate(order) && (
          <button
            type="button"
            onClick={() => onRate(order)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 text-sm font-black text-white"
          >
            <Star size={17} />
            Rate order
          </button>
        )}

        <Link
          to={`/complaints?orderId=${order._id}`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-rose-50 text-sm font-black text-rose-600"
        >
          <MessageSquareWarning size={17} />
          Complaint
        </Link>
      </div>
    </motion.article>
  );
}

export default function OrderHistory() {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentError, setPaymentError] = useState("");

  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data } = await api.get("/orders");
      return data.orders || [];
    }
  });

  const orders = ordersQuery.data || [];

  const stats = useMemo(() => {
    return {
      total: orders.length,
      active: orders.filter((order) => !["Delivered", "Cancelled", "Refunded"].includes(order.stage)).length,
      delivered: orders.filter((order) => order.stage === "Delivered").length
    };
  }, [orders]);

  async function retryPayment(order) {
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
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-28 pt-24 sm:px-6 lg:px-8">
      <section className="mb-6 overflow-hidden rounded-[30px] bg-lora-dark p-5 text-white shadow-card sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-lora-lime">
          Orders
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          My orders
        </h1>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/10 p-4">
            <ReceiptText size={20} className="text-lora-lime" />
            <p className="mt-3 text-2xl font-black">{stats.total}</p>
            <p className="text-sm font-bold text-white/60">Total orders</p>
          </div>

          <div className="rounded-2xl bg-white/10 p-4">
            <Truck size={20} className="text-lora-lime" />
            <p className="mt-3 text-2xl font-black">{stats.active}</p>
            <p className="text-sm font-bold text-white/60">Active</p>
          </div>

          <div className="rounded-2xl bg-white/10 p-4">
            <PackageCheck size={20} className="text-lora-lime" />
            <p className="mt-3 text-2xl font-black">{stats.delivered}</p>
            <p className="text-sm font-bold text-white/60">Delivered</p>
          </div>
        </div>
      </section>

      {paymentError && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
          <AlertTriangle size={17} />
          {paymentError}
        </div>
      )}

      {ordersQuery.isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-44 animate-pulse rounded-[28px] bg-white"
            />
          ))}
        </div>
      ) : ordersQuery.isError ? (
        <div className="rounded-[28px] bg-rose-50 p-6 text-center text-sm font-bold text-rose-600">
          {getErrorMessage(ordersQuery.error, "Orders could not load.")}
        </div>
      ) : orders.length ? (
        <div className="grid gap-4">
          {orders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              onRate={setSelectedOrder}
              onRetryPayment={retryPayment}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[30px] bg-white p-8 text-center shadow-soft-card ring-1 ring-slate-100">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-lora-green">
            <ReceiptText size={30} />
          </div>

          <h2 className="mt-5 text-2xl font-black text-slate-950">
            No orders yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-6 text-slate-500">
            Your grocery orders will appear here after checkout.
          </p>

          <Link
            to="/products"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-lora-green px-6 text-sm font-black text-white shadow-green-soft"
          >
            Start shopping
          </Link>
        </div>
      )}

      <RateOrderModal
        open={Boolean(selectedOrder)}
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </main>
  );
}