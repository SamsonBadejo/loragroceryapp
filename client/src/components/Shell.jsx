import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  ClipboardList,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  Search,
  Settings,
  ShoppingBag,
  Truck,
  UserRound,
  X
} from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";

import CartDrawer from "./CartDrawer";
import NotificationDrawer from "./NotificationDrawer";
import ProfileDropdown from "./ProfileDropdown";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import { useNotificationStore } from "../store/notificationStore";

function avatarUrl(user) {
  const avatar = user?.avatar || user?.profileImage;

  if (!avatar) return "";
  if (typeof avatar === "string") return avatar;

  return avatar.secure_url || avatar.url || "";
}

function initials(name) {
  const parts = String(name || "L").trim().split(" ").filter(Boolean);

  if (!parts.length) return "L";

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function accountPath(user) {
  if (!user) return "/auth";
  if (user.role === "admin") return "/admin";
  if (user.role === "rider" || user.role === "deliveryBoy") return "/rider";
  return "/settings";
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Lo'ra home">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-lora-green text-lg font-black text-white shadow-green-soft">
        L
      </span>

      <span className="text-xl font-black tracking-tight text-slate-950">
        Lo'ra
      </span>
    </Link>
  );
}

function AvatarButton({ user }) {
  const image = avatarUrl(user);

  return (
    <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-emerald-50 text-sm font-black text-lora-green ring-1 ring-emerald-100">
      {image ? (
        <img
          src={image}
          alt={user?.name || "Profile"}
          className="h-full w-full object-cover"
        />
      ) : user ? (
        initials(user.name)
      ) : (
        <UserRound size={18} />
      )}
    </span>
  );
}

function desktopLinkClass({ isActive }) {
  return `rounded-full px-4 py-2 text-sm font-black transition ${
    isActive
      ? "bg-emerald-50 text-lora-green"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
  }`;
}

function roleDashboardItem(user) {
  if (!user) return null;

  if (user.role === "admin") {
    return {
      to: "/admin",
      label: "Admin",
      icon: LayoutDashboard
    };
  }

  if (user.role === "rider" || user.role === "deliveryBoy") {
    return {
      to: "/rider",
      label: "Delivery",
      icon: Truck
    };
  }

  return null;
}

function MobileDrawer({ open, onClose, user, logout, openCart, itemCount }) {
  const dashboardItem = roleDashboardItem(user);

  const menuItems = [
    { to: "/", label: "Home", icon: Home, show: true },
    { to: "/products", label: "Shop groceries", icon: Search, show: true },
    { to: "/orders", label: "My orders", icon: ClipboardList, show: Boolean(user && user.role === "customer") },
    { to: "/wishlist", label: "Wishlist", icon: Heart, show: Boolean(user && user.role === "customer") },
    { to: "/settings", label: "Profile settings", icon: Settings, show: Boolean(user) },
    dashboardItem ? { ...dashboardItem, show: true } : null
  ].filter(Boolean);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] bg-slate-950/35 backdrop-blur-sm md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            className="absolute left-0 top-0 h-full w-[84vw] max-w-[340px] overflow-y-auto bg-white p-5 shadow-2xl"
            initial={{ x: -360 }}
            animate={{ x: 0 }}
            exit={{ x: -360 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <Logo />

              <button
                type="button"
                onClick={onClose}
                className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-700"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 rounded-[24px] bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <AvatarButton user={user} />

                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">
                    {user ? user.name : "Welcome to Lo'ra"}
                  </p>
                  <p className="truncate text-xs font-bold text-slate-500">
                    {user ? user.email || user.role : "Sign in to shop faster"}
                  </p>
                </div>
              </div>

              <Link
                to={accountPath(user)}
                onClick={onClose}
                className="mt-4 block rounded-full bg-lora-green px-4 py-3 text-center text-sm font-black text-white shadow-green-soft"
              >
                {user ? "Go to account" : "Sign in"}
              </Link>
            </div>

            <div className="mt-5 grid gap-1">
              {menuItems.map((item) => {
                if (!item.show) return null;

                const Icon = item.icon;

                return (
                  <Link
                    key={`${item.to}-${item.label}`}
                    to={item.to}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
                  >
                    <Icon size={18} className="text-lora-green" />
                    {item.label}
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  openCart();
                  onClose();
                }}
                className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-black text-slate-800 transition hover:bg-slate-50"
              >
                <ShoppingBag size={18} className="text-lora-green" />
                Cart ({itemCount})
              </button>

              {user && (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="mt-3 flex items-center gap-3 rounded-2xl bg-rose-50 px-3 py-3 text-left text-sm font-black text-rose-600"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BottomNav({ user, openCart, openMenu, itemCount }) {
  const dashboardItem = roleDashboardItem(user);

  if (dashboardItem) {
    const Icon = dashboardItem.icon;

    return (
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-100 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          <MobileNavLink to="/" icon={Home} label="Home" />
          <MobileNavLink to={dashboardItem.to} icon={Icon} label={dashboardItem.label} />
          <button
            type="button"
            onClick={openCart}
            className="relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl text-xs font-black text-slate-500"
          >
            <ShoppingBag size={19} />
            Cart
            {itemCount > 0 && (
              <span className="absolute right-5 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-lora-green px-1 text-[10px] text-white">
                {itemCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={openMenu}
            className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl text-xs font-black text-slate-500"
          >
            <UserRound size={19} />
            Menu
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-100 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        <MobileNavLink to="/" icon={Home} label="Home" />
        <MobileNavLink to="/products" icon={Search} label="Shop" />

        <button
          type="button"
          onClick={openCart}
          className="relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl text-xs font-black text-slate-500"
        >
          <ShoppingBag size={19} />
          Cart

          {itemCount > 0 && (
            <span className="absolute right-5 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-lora-green px-1 text-[10px] text-white">
              {itemCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={openMenu}
          className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl text-xs font-black text-slate-500"
        >
          <UserRound size={19} />
          Menu
        </button>
      </div>
    </nav>
  );
}

function MobileNavLink({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl text-xs font-black transition ${
          isActive ? "bg-emerald-50 text-lora-green" : "text-slate-500"
        }`
      }
    >
      <Icon size={19} />
      {label}
    </NavLink>
  );
}

export default function Shell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const syncCart = useCartStore((state) => state.sync);
  const setCartOpen = useCartStore((state) => state.setOpen);
  const itemCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  );

  const syncNotifications = useNotificationStore((state) => state.sync);
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  const dashboardItem = roleDashboardItem(user);

  useEffect(() => {
    if (user) {
      void syncCart();
      void syncNotifications();
    }
  }, [syncCart, syncNotifications, user]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f6f7f4] text-slate-950">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-700 md:hidden"
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>

            <Logo />
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/" className={desktopLinkClass}>
              Home
            </NavLink>

            <NavLink to="/products" className={desktopLinkClass}>
              Shop
            </NavLink>

            {user?.role === "customer" && (
              <>
                <NavLink to="/orders" className={desktopLinkClass}>
                  Orders
                </NavLink>

                <NavLink to="/wishlist" className={desktopLinkClass}>
                  Wishlist
                </NavLink>
              </>
            )}

            {dashboardItem && (
              <NavLink to={dashboardItem.to} className={desktopLinkClass}>
                {dashboardItem.label}
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/products"
              className="hidden h-10 items-center gap-2 rounded-full bg-slate-100 px-4 text-sm font-black text-slate-700 md:inline-flex"
            >
              <Search size={17} />
              Search
            </Link>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-700"
              aria-label="Open cart"
            >
              <ShoppingBag size={19} />

              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-lora-green px-1 text-[10px] font-black text-white">
                  {itemCount}
                </span>
              )}
            </button>

            {user && (
              <div className="relative hidden md:block">
                <NotificationDrawer unreadCount={unreadCount} />
              </div>
            )}

            {user ? (
              <div className="hidden md:block">
                <ProfileDropdown />
              </div>
            ) : (
              <Link
                to="/auth"
                className="hidden rounded-full bg-lora-green px-5 py-2.5 text-sm font-black text-white shadow-green-soft md:inline-flex"
              >
                Sign in
              </Link>
            )}

            {user ? (
              <Link to={accountPath(user)} className="md:hidden">
                <AvatarButton user={user} />
              </Link>
            ) : (
              <Link
                to="/auth"
                className="rounded-full bg-lora-green px-4 py-2 text-xs font-black text-white md:hidden"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <MobileDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        user={user}
        logout={logout}
        openCart={() => setCartOpen(true)}
        itemCount={itemCount}
      />

      <main className="pt-16 lg:pt-20">{children}</main>

      <BottomNav
        user={user}
        openCart={() => setCartOpen(true)}
        openMenu={() => setMenuOpen(true)}
        itemCount={itemCount}
      />

      <CartDrawer />
    </div>
  );
}