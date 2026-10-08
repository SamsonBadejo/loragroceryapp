import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bike,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Loader2,
  MapPin,
  PackageCheck,
  Phone,
  ReceiptText,
  Search,
  Star,
  Truck,
  UserRound,
  X
} from "lucide-react";

import { api, currency, getErrorMessage } from "../lib/api";

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

function getOrderId(order) {
  return order._id || order.id;
}

function getCustomer(order) {
  return order.user || order.customer || {};
}

function getCustomerName(order) {
  const customer = getCustomer(order);
  return customer.name || order.customerName || "Customer";
}

function getCustomerEmail(order) {
  const customer = getCustomer(order);
  return customer.email || "";
}

function getWorker(order) {
  return order.assignedRider || order.rider || order.deliveryWorker || null;
}

function getWorkerName(order) {
  const worker = getWorker(order);
  return worker?.name || "Not assigned";
}

function getTotal(order) {
  return order.totals?.total || order.total || 0;
}

function getStage(order) {
  return order.stage || order.status || "Pending";
}

function getItems(order) {
  return order.items || order.products || [];
}

function statusColor(stage) {
  if (stage === "Delivered") return "bg-emerald-50 text-lora-green";
  if (stage === "Cancelled" || stage === "Refunded") return "bg-rose-50 text-rose-600";
  if (stage === "On The Way" || stage === "Picked Up") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
}

function paymentColor(status) {
  if (status === "paid") return "bg-emerald-50 text-lora-green";
  if (status === "failed" || status === "refunded") return "bg-rose-50 text-rose-600";
  return "bg-slate-100 text-slate-600";
}

function RatingRow({ label, value }) {
  if (!value) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
      <span className="text-sm font-bold text-slate-600">{label}</span>
      <span className="inline-flex items-center gap-1 text-sm font-black text-slate-950">
        <Star size={15} className="fill-amber-400 text-amber-400" />
        {value}
      </span>
    </div>
  );
}

function OrderDetailsModal({ order, onClose, onStageChange, updating }) {
  const orderId = getOrderId(order);
  const customer = getCustomer(order);
  const worker = getWorker(order);
  const items = getItems(order);
  const stage = getStage(order);
  const address = order.address || {};
  const review = order.review || order.rating || null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-slate-950/45 p-3 backdrop-blur-sm sm:p-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="mx-auto flex min-h-full max-w-5xl items-end justify-center sm:items-center">
          <motion.section
            initial={{ y: 28, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 28, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="max-h-[92vh] w-full overflow-hidden rounded-[30px] bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-lora-green">
                  Order details
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  {order.orderNumber || `Order #${String(orderId).slice(-6)}`}
                </h2>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${statusColor(stage)}`}>
                    {stage}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${paymentColor(order.paymentStatus)}`}>
                    {order.paymentStatus || "pending"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {order.deliveryServiceType === "deliveryBoy"
                      ? "Delivery boy"
                      : "Rider"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="grid h-11 w-11 place-items-center rounded-full bg-slate-50 text-slate-500"
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </header>

            <div className="grid max-h-[76vh] gap-5 overflow-y-auto p-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-5">
                <section className="rounded-[24px] bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <UserRound size={18} className="text-lora-green" />
                    <h3 className="font-black text-slate-950">Customer</h3>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Name
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-950">
                        {customer.name || getCustomerName(order)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Email
                      </p>
                      <p className="mt-1 truncate text-sm font-black text-slate-950">
                        {customer.email || getCustomerEmail(order) || "Not provided"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Phone
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-950">
                        {address.phone || customer.phone || "Not provided"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Delivery type
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-950">
                        {order.deliveryServiceType === "deliveryBoy"
                          ? "Nearby delivery boy"
                          : "Rider delivery"}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[24px] bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <MapPin size={18} className="text-lora-green" />
                    <h3 className="font-black text-slate-950">Delivery address</h3>
                  </div>

                  <div className="mt-4 rounded-2xl bg-white p-4">
                    <p className="text-sm font-black text-slate-950">
                      {address.recipientName || customer.name || "Recipient"}
                    </p>
                    <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
                      {[address.line1, address.city, address.state]
                        .filter(Boolean)
                        .join(", ") || "No address details"}
                    </p>
                    {order.deliveryNotes && (
                      <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-lora-dark">
                        {order.deliveryNotes}
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-[24px] bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <PackageCheck size={18} className="text-lora-green" />
                    <h3 className="font-black text-slate-950">Items</h3>
                  </div>

                  <div className="mt-4 space-y-3">
                    {items.map((item, index) => (
                      <div
                        key={item.product || item._id || index}
                        className="flex items-center gap-3 rounded-2xl bg-white p-3"
                      >
                        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-100">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <PackageCheck size={20} className="text-slate-300" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-950">
                            {item.name}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {item.quantity} x {currency(item.price)} / {item.unit}
                          </p>
                        </div>

                        <p className="text-sm font-black text-slate-950">
                          {currency(item.subtotal || item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="space-y-5">
                <section className="rounded-[24px] bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <CreditCard size={18} className="text-lora-green" />
                    <h3 className="font-black text-slate-950">Payment summary</h3>
                  </div>

                  <div className="mt-4 space-y-3 rounded-2xl bg-white p-4">
                    <div className="flex justify-between text-sm font-bold text-slate-500">
                      <span>Subtotal</span>
                      <span>{currency(order.totals?.subtotal || order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-500">
                      <span>Tax</span>
                      <span>{currency(order.totals?.tax || order.tax)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-500">
                      <span>Delivery</span>
                      <span>{currency(order.totals?.deliveryFee || order.deliveryFee)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-3 text-lg font-black text-slate-950">
                      <span>Total</span>
                      <span>{currency(getTotal(order))}</span>
                    </div>
                  </div>
                </section>

                <section className="rounded-[24px] bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    {order.deliveryServiceType === "deliveryBoy" ? (
                      <Bike size={18} className="text-lora-green" />
                    ) : (
                      <Truck size={18} className="text-lora-green" />
                    )}
                    <h3 className="font-black text-slate-950">Assigned worker</h3>
                  </div>

                  <div className="mt-4 rounded-2xl bg-white p-4">
                    <p className="text-sm font-black text-slate-950">
                      {getWorkerName(order)}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                      {worker?.role === "deliveryBoy"
                        ? "Delivery boy"
                        : worker?.role === "rider"
                          ? "Rider"
                          : "Not assigned"}
                    </p>

                    {worker?.phone && (
                      <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-slate-500">
                        <Phone size={15} />
                        {worker.phone}
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-[24px] bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <ClipboardList size={18} className="text-lora-green" />
                    <h3 className="font-black text-slate-950">Update stage</h3>
                  </div>

                  <select
                    value={stage}
                    disabled={updating}
                    onChange={(event) => onStageChange(order, event.target.value)}
                    className="mt-4 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 outline-none focus:border-lora-green"
                  >
                    {stages.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </section>

                <section className="rounded-[24px] bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <Star size={18} className="text-lora-green" />
                    <h3 className="font-black text-slate-950">Rating</h3>
                  </div>

                  {review ? (
                    <div className="mt-4 space-y-2">
                      <RatingRow label="Rider" value={review.riderRating} />
                      <RatingRow label="Packaging" value={review.packagingRating} />
                      <RatingRow label="Speed" value={review.speedRating} />
                      <RatingRow
                        label="Product quality"
                        value={review.productQualityRating}
                      />
                      {review.comment && (
                        <p className="rounded-2xl bg-white p-3 text-sm font-bold leading-6 text-slate-600">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-2xl bg-white p-4 text-sm font-bold text-slate-500">
                      No rating has been submitted for this order yet.
                    </p>
                  )}
                </section>
              </aside>
            </div>
          </motion.section>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function AdminOrderManager() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const {
    data,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const res = await api.get("/orders/admin");
      return res.data;
    }
  });

  const orders = useMemo(() => {
    const list = data?.orders || data?.items || data?.data || data || [];
    return Array.isArray(list) ? list : [];
  }, [data]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const stage = getStage(order);

      if (stageFilter !== "all" && stage !== stageFilter) {
        return false;
      }

      if (!query) return true;

      return [
        order.orderNumber,
        getCustomerName(order),
        getCustomerEmail(order),
        getWorkerName(order),
        stage,
        order.paymentStatus,
        order.deliveryServiceType
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [orders, search, stageFilter]);

  const updateStageMutation = useMutation({
    mutationFn: async ({ order, stage }) => {
      const res = await api.patch(`/orders/${getOrderId(order)}/stage`, {
        stage
      });

      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });

      const updatedOrder = data.order || data;
      if (updatedOrder?._id) {
        setSelectedOrder(updatedOrder);
      }
    }
  });

  function updateStage(order, stage) {
    updateStageMutation.mutate({ order, stage });
  }

  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-soft-card">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-lora-green">
            Orders
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            Order management
          </h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            View full order details, track payment, update stages and inspect
            ratings after delivery.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search orders..."
              className="h-12 w-full rounded-full border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-lora-green focus:bg-white"
            />
          </div>

          <select
            value={stageFilter}
            onChange={(event) => setStageFilter(event.target.value)}
            className="h-12 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none transition focus:border-lora-green focus:bg-white"
          >
            <option value="all">All stages</option>
            {stages.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-[22px] bg-slate-100"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-5 rounded-[24px] bg-rose-50 p-5 text-sm font-bold text-rose-600">
          {getErrorMessage(error)}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <ReceiptText className="mx-auto text-slate-300" size={42} />
          <h3 className="mt-3 font-black text-slate-950">No orders found</h3>
          <p className="mt-1 text-sm font-bold text-slate-500">
            Orders will appear here after checkout and successful payment.
          </p>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-100">
          <div className="hidden grid-cols-[1fr_1fr_130px_130px_150px_44px] gap-4 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-400 lg:grid">
            <span>Order</span>
            <span>Customer</span>
            <span>Payment</span>
            <span>Stage</span>
            <span>Total</span>
            <span />
          </div>

          <div className="divide-y divide-slate-100">
            {filteredOrders.map((order) => {
              const stage = getStage(order);

              return (
                <button
                  key={getOrderId(order)}
                  type="button"
                  onClick={() => setSelectedOrder(order)}
                  className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50 lg:grid-cols-[1fr_1fr_130px_130px_150px_44px] lg:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">
                      {order.orderNumber ||
                        `Order #${String(getOrderId(order)).slice(-6)}`}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {order.deliveryServiceType === "deliveryBoy"
                        ? "Delivery boy"
                        : "Rider"}{" "}
                      delivery
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">
                      {getCustomerName(order)}
                    </p>
                    <p className="mt-1 truncate text-xs font-bold text-slate-500">
                      {getCustomerEmail(order) || getWorkerName(order)}
                    </p>
                  </div>

                  <div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${paymentColor(order.paymentStatus)}`}>
                      {order.paymentStatus || "pending"}
                    </span>
                  </div>

                  <div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusColor(stage)}`}>
                      {stage}
                    </span>
                  </div>

                  <p className="text-sm font-black text-slate-950">
                    {currency(getTotal(order))}
                  </p>

                  <ChevronRight className="hidden text-slate-300 lg:block" size={20} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {updateStageMutation.isPending && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">
          <Loader2 className="animate-spin" size={16} />
          Updating order...
        </div>
      )}

      {updateStageMutation.isSuccess && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-lora-green">
          <CheckCircle2 size={16} />
          Order updated.
        </div>
      )}

      {updateStageMutation.isError && (
        <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
          {getErrorMessage(updateStageMutation.error)}
        </div>
      )}

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStageChange={updateStage}
          updating={updateStageMutation.isPending}
        />
      )}
    </section>
  );
}