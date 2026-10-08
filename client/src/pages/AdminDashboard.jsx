import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  Bike,
  Boxes,
  ChevronRight,
  ClipboardList,
  ImagePlus,
  LayoutDashboard,
  MessageSquareWarning,
  PackageCheck,
  ReceiptText,
  Settings,
  ShoppingBag,
  Truck,
  UsersRound
} from "lucide-react";

import { api, currency, getErrorMessage } from "../lib/api";
import HeroSlidesManager from "../components/HeroSlidesManager";
import AdminInventoryManager from "../components/AdminInventoryManager";
import AdminOrderManager from "../components/AdminOrderManager";
import { AdminRiderManager } from "../components/AdminRiderManager";
import { AdminDeliverySettings } from "../components/AdminDeliverySettings";
import AdminComplaintsManager from "../components/AdminComplaintsManager";

const tabs = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard
  },
  {
    id: "hero",
    label: "Hero Slides",
    icon: ImagePlus
  },
  {
    id: "products",
    label: "Products",
    icon: Boxes
  },
  {
    id: "orders",
    label: "Orders",
    icon: ReceiptText
  },
  {
    id: "workers",
    label: "Riders",
    icon: Bike
  },
  {
    id: "complaints",
    label: "Complaints",
    icon: MessageSquareWarning
  },
  {
    id: "delivery",
    label: "Delivery",
    icon: Settings
  }
];

function safeNumber(value) {
  return Number(value || 0);
}

function getOrderCustomer(order) {
  return order.user?.name || order.customer?.name || order.customerName || "Customer";
}

function getOrderTotal(order) {
  return order.totals?.total || order.total || 0;
}

function getOrderStage(order) {
  return order.stage || order.status || "Pending";
}

function getOrderId(order) {
  return order._id || order.id;
}

function StatCard({ title, value, note, icon: Icon, tone = "green" }) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-50 text-amber-700"
      : tone === "rose"
        ? "bg-rose-50 text-rose-700"
        : tone === "blue"
          ? "bg-blue-50 text-blue-700"
          : "bg-emerald-50 text-lora-green";

  return (
    <article className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-soft-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            {title}
          </p>
          <h3 className="mt-3 text-2xl font-black text-slate-950">{value}</h3>
          {note && <p className="mt-1 text-sm font-bold text-slate-500">{note}</p>}
        </div>

        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${toneClass}`}>
          <Icon size={20} />
        </div>
      </div>
    </article>
  );
}

function OverviewPanel() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const res = await api.get("/admin/overview");
      return res.data;
    },
    retry: 1
  });

  const overview = data || {};

  const metrics = useMemo(() => {
    const source = overview.metrics || overview;

    return {
      revenue:
        source.totalRevenue ||
        source.revenue ||
        source.sales ||
        source.dailyRevenue ||
        0,
      orders:
        source.totalOrders ||
        source.orders ||
        source.activeOrders ||
        source.orderCount ||
        0,
      products:
        source.totalProducts ||
        source.products ||
        source.productCount ||
        0,
      customers:
        source.totalCustomers ||
        source.customers ||
        source.customerCount ||
        0,
      riders:
        source.totalRiders ||
        source.riders ||
        source.riderCount ||
        0,
      deliveryBoys:
        source.totalDeliveryBoys ||
        source.deliveryBoys ||
        source.deliveryBoyCount ||
        0,
      complaints:
        source.openComplaints ||
        source.complaints ||
        source.complaintCount ||
        0
    };
  }, [overview]);

  const recentOrders =
    overview.recentOrders ||
    overview.orders ||
    overview.latestOrders ||
    [];

  const lowStock =
    overview.lowStockProducts ||
    overview.lowStock ||
    overview.stockAlerts ||
    [];

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-[24px] bg-white shadow-soft-card"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-[28px] border border-rose-100 bg-rose-50 p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-rose-600">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-black text-rose-900">Overview could not load</h3>
            <p className="mt-1 text-sm font-bold text-rose-600">
              {getErrorMessage(error)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Revenue"
          value={currency(metrics.revenue)}
          note="Confirmed sales"
          icon={BarChart3}
        />
        <StatCard
          title="Orders"
          value={safeNumber(metrics.orders).toLocaleString()}
          note="All order activity"
          icon={ReceiptText}
          tone="blue"
        />
        <StatCard
          title="Products"
          value={safeNumber(metrics.products).toLocaleString()}
          note="Inventory items"
          icon={ShoppingBag}
        />
        <StatCard
          title="Customers"
          value={safeNumber(metrics.customers).toLocaleString()}
          note="Registered buyers"
          icon={UsersRound}
          tone="blue"
        />
        <StatCard
          title="Riders"
          value={safeNumber(metrics.riders).toLocaleString()}
          note="Long distance delivery"
          icon={Truck}
        />
        <StatCard
          title="Delivery Boys"
          value={safeNumber(metrics.deliveryBoys).toLocaleString()}
          note="Nearby local delivery"
          icon={Bike}
        />
        <StatCard
          title="Complaints"
          value={safeNumber(metrics.complaints).toLocaleString()}
          note="Needs attention"
          icon={MessageSquareWarning}
          tone="rose"
        />
        <StatCard
          title="Stock Alerts"
          value={safeNumber(lowStock.length).toLocaleString()}
          note="Low or unavailable"
          icon={PackageCheck}
          tone="amber"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-soft-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-lora-green">
                Orders
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Recent orders
              </h2>
            </div>

            <button
              type="button"
              className="rounded-full bg-slate-50 px-4 py-2 text-sm font-black text-slate-700"
            >
              Live
            </button>
          </div>

          <div className="mt-5 overflow-hidden rounded-[22px] border border-slate-100">
            {recentOrders.length === 0 ? (
              <div className="p-6 text-center">
                <ReceiptText className="mx-auto text-slate-300" size={34} />
                <p className="mt-3 text-sm font-bold text-slate-500">
                  No recent orders yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentOrders.slice(0, 8).map((order) => {
                  const orderId = getOrderId(order);

                  return (
                    <Link
                      key={orderId}
                      to={`/admin/orders?order=${orderId}`}
                      className="flex items-center justify-between gap-4 p-4 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">
                          {order.orderNumber || `Order #${String(orderId).slice(-6)}`}
                        </p>
                        <p className="mt-1 truncate text-xs font-bold text-slate-500">
                          {getOrderCustomer(order)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-black text-slate-950">
                          {currency(getOrderTotal(order))}
                        </p>
                        <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-lora-green">
                          {getOrderStage(order)}
                        </span>
                      </div>

                      <ChevronRight className="hidden text-slate-300 sm:block" size={18} />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-soft-card">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-500">
              Inventory
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              Stock watch
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            {lowStock.length === 0 ? (
              <div className="rounded-[22px] bg-emerald-50 p-5 text-sm font-bold text-lora-dark">
                Inventory looks healthy.
              </div>
            ) : (
              lowStock.slice(0, 6).map((product) => (
                <div
                  key={product._id || product.id || product.name}
                  className="flex items-center justify-between gap-4 rounded-[20px] bg-slate-50 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">
                      {product.name}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      Stock: {product.stock ?? product.stockQuantity ?? 0}
                    </p>
                  </div>

                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                    Restock
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const activeLabel = tabs.find((tab) => tab.id === activeTab)?.label || "Overview";

  return (
    <main className="min-h-screen bg-[#f6faf7] px-3 py-4 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[32px] bg-lora-dark p-5 text-white shadow-glow sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-lora-lime">
                Lo'ra admin
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Store control center
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/70">
                Manage products, hero banners, orders, riders, delivery boys,
                complaints, and delivery pricing from one clean dashboard.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex">
              <button
                type="button"
                onClick={() => setActiveTab("products")}
                className="rounded-full bg-white px-5 py-3 text-sm font-black text-lora-dark"
              >
                Add product
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("hero")}
                className="rounded-full bg-lora-green px-5 py-3 text-sm font-black text-white"
              >
                Upload hero
              </button>
            </div>
          </div>
        </section>

        <nav className="sticky top-2 z-20 mt-4 overflow-x-auto rounded-[24px] border border-slate-100 bg-white/90 p-2 shadow-soft-card backdrop-blur no-scrollbar">
          <div className="flex min-w-max gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
                    active
                      ? "bg-lora-green text-white shadow-green-soft"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <Icon size={17} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        <section className="mt-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-lora-green">
                Current section
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                {activeLabel}
              </h2>
            </div>
          </div>

          {activeTab === "overview" && <OverviewPanel />}
          {activeTab === "hero" && <HeroSlidesManager />}
          {activeTab === "products" && <AdminInventoryManager />}
          {activeTab === "orders" && <AdminOrderManager />}
          {activeTab === "workers" && <AdminRiderManager />}
          {activeTab === "complaints" && <AdminComplaintsManager />}
          {activeTab === "delivery" && <AdminDeliverySettings />}
        </section>
      </div>
    </main>
  );
}