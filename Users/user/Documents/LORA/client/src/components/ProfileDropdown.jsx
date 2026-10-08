import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bike,
  Camera,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PackageCheck,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRound,
  WalletCards,
  X
} from "lucide-react";

import { api, currency, getErrorMessage } from "../lib/api";
import { useAuthStore } from "../store/authStore";

function avatarUrl(user) {
  const avatar = user?.avatar || user?.profileImage;

  if (!avatar) return "";
  if (typeof avatar === "string") return avatar;

  return avatar.secure_url || avatar.url || "";
}

function initials(name = "User") {
  const parts = String(name).trim().split(" ").filter(Boolean);

  if (!parts.length) return "L";

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function firstName(name = "") {
  return String(name).trim().split(" ")[0] || "there";
}

function roleLabel(role) {
  if (role === "admin") return "Admin";
  if (role === "rider") return "Rider";
  if (role === "deliveryBoy") return "Delivery Boy";
  return "Customer";
}

function dashboardPath(user) {
  if (user?.role === "admin") return "/admin";
  if (user?.role === "rider" || user?.role === "deliveryBoy") return "/rider";
  return "/settings";
}

function dashboardLabel(user) {
  if (user?.role === "admin") return "Admin dashboard";
  if (user?.role === "rider") return "Rider dashboard";
  if (user?.role === "deliveryBoy") return "Delivery dashboard";
  return "Profile settings";
}

function dashboardIcon(user) {
  if (user?.role === "admin") return LayoutDashboard;
  if (user?.role === "rider") return Truck;
  if (user?.role === "deliveryBoy") return Bike;
  return Settings;
}

function isActiveOrder(order) {
  return !["Delivered", "Cancelled", "Refunded"].includes(order?.stage);
}

function isCustomer(user) {
  return user?.role === "customer";
}

function getOrderTotal(order) {
  return order?.totals?.total || order?.total || 0;
}

function Avatar({ user, size = "md" }) {
  const image = avatarUrl(user);
  const sizeClass = size === "lg" ? "h-16 w-16 text-xl" : "h-10 w-10 text-sm";

  return (
    <span
      className={`grid ${sizeClass} place-items-center overflow-hidden rounded-2xl bg-lora-green font-black text-white`}
    >
      {image ? (
        <img
          src={image}
          alt={user?.name || "Profile"}
          className="h-full w-full object-cover"
        />
      ) : (
        initials(user?.name)
      )}
    </span>
  );
}

function MenuLink({ to, icon: Icon, label, caption, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl px-4 py-3 transition hover:bg-lora-mist"
    >
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-lora-green">
        <Icon size={18} />
      </span>

      <span className="min-w-0">
        <span className="block text-sm font-black text-slate-900">{label}</span>
        {caption && (
          <span className="block truncate text-xs font-bold text-slate-400">
            {caption}
          </span>
        )}
      </span>
    </Link>
  );
}

export default function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const setSession = useAuthStore((state) => state.setSession);
  const logout = useAuthStore((state) => state.logout);

  const ordersQuery = useQuery({
    queryKey: ["profile-dropdown-orders"],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await api.get("/orders?limit=5");
      return data.orders || [];
    },
    staleTime: 30000
  });

  const statsQuery = useQuery({
    queryKey: ["profile-dropdown-stats"],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await api.get("/users/profile/stats");
      return data.stats || {};
    },
    staleTime: 60000
  });

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  if (!user) return null;

  const DashboardIcon = dashboardIcon(user);
  const orders = ordersQuery.data || [];
  const activeOrder = orders.find(isActiveOrder);
  const latestOrder = orders[0];
  const stats = statsQuery.data || {};
  const totalOrders = stats.totalOrders || user.totalOrders || user.ordersCount || 0;
  const hasPassword = Boolean(user.hasPassword);
  const googleConnected = Boolean(user.googleId);

  const quickLinks = [
    {
      label: dashboardLabel(user),
      caption: roleLabel(user),
      to: dashboardPath(user),
      icon: DashboardIcon,
      show: true
    },
    {
      label: "My orders",
      caption: `${totalOrders} total orders`,
      to: "/orders",
      icon: ClipboardList,
      show: isCustomer(user)
    },
    {
      label: activeOrder ? "Track active order" : "Delivery tracking",
      caption: activeOrder ? activeOrder.orderNumber : "No active order",
      to: activeOrder ? `/tracking/${activeOrder._id}` : "/orders",
      icon: Truck,
      show: isCustomer(user)
    },
    {
      label: "Account security",
      caption: hasPassword
        ? googleConnected
          ? "Google + password"
          : "Password enabled"
        : "Set password",
      to: "/settings",
      icon: ShieldCheck,
      show: true
    }
  ].filter((item) => item.show);

  async function uploadPhoto(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError("Profile image must be less than 3MB.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const { data } = await api.patch("/users/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      setSession(
        {
          ...user,
          ...(data.user || {})
        },
        accessToken,
        refreshToken
      );

      queryClient.invalidateQueries({ queryKey: ["profile-dropdown-stats"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (err) {
      setError(getErrorMessage(err, "Profile photo could not be uploaded."));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // Logout locally even if the server is unreachable.
    }

    logout();
    setOpen(false);
    navigate("/", { replace: true });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 items-center gap-2 rounded-full bg-white px-2 pr-3 text-sm font-black text-slate-900 shadow-sm ring-1 ring-slate-100 transition hover:ring-lora-green/30"
        aria-expanded={open}
        aria-label="Open profile menu"
      >
        <Avatar user={user} />
        <span className="hidden max-w-[130px] truncate text-left lg:block">
          {firstName(user.name)}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-[70] cursor-default bg-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              aria-label="Close profile menu"
            />

            <motion.div
              className="absolute right-0 top-14 z-[80] w-[min(92vw,380px)] overflow-hidden rounded-[30px] border border-white/70 bg-white shadow-card"
              initial={{ opacity: 0, y: 12, scale: 0.96, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 12, scale: 0.96, filter: "blur(10px)" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="relative overflow-hidden bg-lora-dark p-5 text-white">
                <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-lora-lime/25 blur-3xl" />

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white"
                  aria-label="Close profile menu"
                >
                  <X size={17} />
                </button>

                <div className="relative flex items-center gap-4 pr-10">
                  <div className="relative">
                    <Avatar user={user} size="lg" />

                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      disabled={uploading}
                      className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-white text-lora-dark shadow-sm transition hover:bg-lora-lime disabled:opacity-60"
                      title="Change photo"
                    >
                      <Camera size={15} />
                    </button>

                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={uploadPhoto}
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-lg font-black">{user.name}</p>
                    <p className="truncate text-sm font-semibold text-white/70">
                      {user.email}
                    </p>
                    <p className="mt-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-black">
                      {roleLabel(user.role)}
                    </p>
                  </div>
                </div>

                {error && (
                  <p className="relative mt-4 rounded-2xl bg-rose-500/15 p-3 text-xs font-bold text-rose-100">
                    {error}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 p-3">
                <div className="rounded-2xl bg-slate-50 p-3 text-center">
                  <p className="text-lg font-black text-slate-950">
                    {totalOrders}
                  </p>
                  <p className="text-xs font-bold text-slate-400">Orders</p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3 text-center">
                  <p className="text-lg font-black text-slate-950">
                    {latestOrder ? currency(getOrderTotal(latestOrder)) : "₦0"}
                  </p>
                  <p className="text-xs font-bold text-slate-400">Last order</p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3 text-center">
                  <p className="text-lg font-black text-slate-950">
                    {activeOrder ? "Live" : "Clear"}
                  </p>
                  <p className="text-xs font-bold text-slate-400">Tracking</p>
                </div>
              </div>

              <div className="grid gap-1 p-3">
                {quickLinks.map((item) => (
                  <MenuLink
                    key={item.label}
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                    caption={item.caption}
                    onClick={() => setOpen(false)}
                  />
                ))}

                {isCustomer(user) && (
                  <MenuLink
                    to="/wishlist"
                    icon={ShoppingBag}
                    label="Saved products"
                    caption="Wishlist and favorites"
                    onClick={() => setOpen(false)}
                  />
                )}

                {isCustomer(user) && (
                  <MenuLink
                    to="/checkout"
                    icon={WalletCards}
                    label="Checkout"
                    caption="Pay securely with Paystack"
                    onClick={() => setOpen(false)}
                  />
                )}

                {activeOrder && (
                  <div className="mx-1 my-2 rounded-[22px] bg-emerald-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-lora-green">
                          Active order
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {activeOrder.orderNumber}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {activeOrder.stage}
                        </p>
                      </div>

                      <PackageCheck className="text-lora-green" size={22} />
                    </div>

                    <Link
                      to={`/tracking/${activeOrder._id}`}
                      onClick={() => setOpen(false)}
                      className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full bg-lora-green text-sm font-black text-white"
                    >
                      Track now
                    </Link>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-rose-50"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-50 text-rose-600">
                    <LogOut size={18} />
                  </span>

                  <span>
                    <span className="block text-sm font-black text-rose-600">
                      Logout
                    </span>
                    <span className="block text-xs font-bold text-rose-300">
                      End current session
                    </span>
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}