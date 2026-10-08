import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Bike,
  CreditCard,
  LocateFixed,
  Loader2,
  MapPin,
  MessageSquareText,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Truck
} from "lucide-react";

import { api, currency, getErrorMessage } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";

const checkoutSchema = z.object({
  recipientName: z.string().min(2, "Recipient name is required"),
  phone: z.string().min(6, "Phone number is required"),
  line1: z.string().min(4, "Delivery address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  deliveryServiceType: z.enum(["deliveryBoy", "rider"]),
  deliveryNotes: z.string().optional()
});

function getProduct(item) {
  return item.product || item;
}

function getImage(product) {
  const image = product?.images?.[0] || product?.image;

  if (!image) return "";
  if (typeof image === "string") return image;

  return image.secure_url || image.url || "";
}

function quantityOf(item) {
  return Number(item.quantity || 1);
}

function priceOf(item) {
  const product = getProduct(item);
  return Number(item.price || product?.price || 0);
}

function isUnavailable(product) {
  return (
    Number(product?.stock || 0) <= 0 ||
    product?.active === false ||
    product?.isAvailable === false ||
    product?.status !== "active"
  );
}

function estimateDeliveryFee(serviceType) {
  return serviceType === "deliveryBoy" ? 1200 : 1500;
}

function estimateEta(serviceType) {
  return serviceType === "deliveryBoy" ? "20-30 mins" : "35-50 mins";
}

function DeliveryOption({
  active,
  icon: Icon,
  title,
  text,
  price,
  eta,
  onClick
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[22px] border p-4 text-left transition ${
        active
          ? "border-lora-green bg-emerald-50 shadow-soft-card"
          : "border-slate-100 bg-white hover:border-lora-green/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
            active ? "bg-lora-green text-white" : "bg-slate-50 text-lora-green"
          }`}
        >
          <Icon size={21} />
        </span>

        <div className="min-w-0">
          <p className="font-black text-slate-950">{title}</p>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
            {text}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-lora-green">
              {price}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">
              {eta}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function CheckoutItem({ item }) {
  const product = getProduct(item);
  const image = getImage(product);
  const quantity = quantityOf(item);
  const price = priceOf(item);

  return (
    <div className="flex gap-3 rounded-2xl bg-slate-50 p-3">
      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
        {image ? (
          <img
            src={image}
            alt={product?.name || "Product"}
            className="h-full w-full object-contain p-1"
          />
        ) : (
          <ShoppingBag size={20} className="text-slate-300" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-black text-slate-950">
          {product?.name || item.name || "Product"}
        </p>
        <p className="mt-1 text-xs font-bold text-slate-400">
          {quantity} × {currency(price)}
        </p>
      </div>

      <p className="shrink-0 text-sm font-black text-lora-dark">
        {currency(price * quantity)}
      </p>
    </div>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const items = useCartStore((state) => state.items);
  const syncCart = useCartStore((state) => state.sync);
  const setCartOpen = useCartStore((state) => state.setOpen);

  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  const form = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      recipientName: user?.name || "",
      phone: user?.phone || "",
      line1: "",
      city: "Lagos",
      state: "Lagos",
      lat: 6.5244,
      lng: 3.3792,
      deliveryServiceType: "deliveryBoy",
      deliveryNotes: ""
    }
  });

  const deliveryServiceType = form.watch("deliveryServiceType");

  useEffect(() => {
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    void syncCart();
  }, [navigate, syncCart, user]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + priceOf(item) * quantityOf(item);
    }, 0);
  }, [items]);

  const unavailableItems = useMemo(() => {
    return items.filter((item) => isUnavailable(getProduct(item)));
  }, [items]);

  const tax = Math.round(subtotal * 0.075);
  const deliveryFee = estimateDeliveryFee(deliveryServiceType);
  const total = subtotal + tax + deliveryFee;

  function useCurrentLocation() {
    setError("");

    if (!navigator.geolocation) {
      setError("Location is not supported on this device.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue("lat", Number(position.coords.latitude.toFixed(6)));
        form.setValue("lng", Number(position.coords.longitude.toFixed(6)));
        setLocating(false);
      },
      () => {
        setError("Please allow location permission or enter the pin manually.");
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }

  async function submit(values) {
    if (!items.length) {
      setError("Your cart is empty.");
      return;
    }

    if (unavailableItems.length > 0) {
      setError("Remove unavailable products before checkout.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const orderPayload = {
        deliveryServiceType: values.deliveryServiceType,
        paymentProvider: "paystack",
        deliveryNotes: values.deliveryNotes || "",
        address: {
          recipientName: values.recipientName,
          phone: values.phone,
          line1: values.line1,
          city: values.city,
          state: values.state,
          location: {
            lat: Number(values.lat),
            lng: Number(values.lng)
          }
        }
      };

      const orderResponse = await api.post("/orders", orderPayload);
      const order = orderResponse.data.order;

      const callbackUrl = `${window.location.origin}/payment/callback`;

      const paymentResponse = await api.post("/payments/paystack/initialize", {
        orderId: order._id,
        callbackUrl
      });

      if (!paymentResponse.data.authorizationUrl) {
        throw new Error("Paystack authorization URL was not returned.");
      }

      window.location.href = paymentResponse.data.authorizationUrl;
    } catch (err) {
      setError(getErrorMessage(err, "Checkout could not be completed."));
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  if (!items.length) {
    return (
      <main className="mx-auto max-w-4xl px-4 pb-28 pt-24 sm:px-6 lg:px-8">
        <section className="rounded-[30px] bg-white p-8 text-center shadow-soft-card ring-1 ring-slate-100">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-lora-green">
            <ShoppingBag size={30} />
          </div>

          <h1 className="mt-5 text-3xl font-black text-slate-950">
            Your cart is empty
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-6 text-slate-500">
            Add groceries to your cart before checking out.
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

  return (
    <main className="mx-auto max-w-7xl px-4 pb-28 pt-24 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-100"
        >
          <ArrowLeft size={17} />
          Back
        </button>

        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-50 px-4 text-sm font-black text-lora-green"
        >
          <ShoppingBag size={17} />
          Cart
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <section className="rounded-[30px] bg-white p-5 shadow-soft-card ring-1 ring-slate-100 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-lora-green">
            Checkout
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Delivery details
          </h1>

          <form onSubmit={form.handleSubmit(submit)} className="mt-6 grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">
                  Recipient name
                </span>
                <input
                  {...form.register("recipientName")}
                  className="h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-lora-green focus:bg-white"
                />
                {form.formState.errors.recipientName && (
                  <span className="text-xs font-bold text-rose-600">
                    {form.formState.errors.recipientName.message}
                  </span>
                )}
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">
                  Phone number
                </span>
                <input
                  {...form.register("phone")}
                  className="h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-lora-green focus:bg-white"
                />
                {form.formState.errors.phone && (
                  <span className="text-xs font-bold text-rose-600">
                    {form.formState.errors.phone.message}
                  </span>
                )}
              </label>

              <label className="grid gap-2 sm:col-span-2">
                <span className="text-sm font-black text-slate-700">
                  Delivery address
                </span>
                <input
                  {...form.register("line1")}
                  placeholder="Street, estate, house number"
                  className="h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-lora-green focus:bg-white"
                />
                {form.formState.errors.line1 && (
                  <span className="text-xs font-bold text-rose-600">
                    {form.formState.errors.line1.message}
                  </span>
                )}
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">City</span>
                <input
                  {...form.register("city")}
                  className="h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-lora-green focus:bg-white"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">State</span>
                <input
                  {...form.register("state")}
                  className="h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-lora-green focus:bg-white"
                />
              </label>
            </div>

            <div className="rounded-[24px] bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-black text-slate-950">
                    <MapPin size={17} className="text-lora-green" />
                    Map pin location
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    This helps calculate distance, ETA, and live tracking.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={locating}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-black text-lora-green shadow-sm disabled:text-slate-400"
                >
                  {locating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <LocateFixed size={16} />
                  )}
                  Use GPS
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  {...form.register("lat")}
                  placeholder="Latitude"
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-lora-green"
                />

                <input
                  {...form.register("lng")}
                  placeholder="Longitude"
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-lora-green"
                />
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-black text-slate-700">
                Delivery option
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <DeliveryOption
                  active={deliveryServiceType === "deliveryBoy"}
                  icon={Bike}
                  title="Delivery Boy"
                  text="Best for nearby local delivery."
                  price="From ₦1,200"
                  eta="20-30 mins"
                  onClick={() => form.setValue("deliveryServiceType", "deliveryBoy")}
                />

                <DeliveryOption
                  active={deliveryServiceType === "rider"}
                  icon={Truck}
                  title="Rider"
                  text="Best for farther locations."
                  price="From ₦1,500"
                  eta="35-50 mins"
                  onClick={() => form.setValue("deliveryServiceType", "rider")}
                />
              </div>
            </div>

            <label className="grid gap-2">
              <span className="flex items-center gap-2 text-sm font-black text-slate-700">
                <MessageSquareText size={17} className="text-lora-green" />
                Delivery note
              </span>

              <textarea
                {...form.register("deliveryNotes")}
                rows={4}
                placeholder="Example: Call when you arrive, gate code, landmark..."
                className="resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none focus:border-lora-green focus:bg-white"
              />
            </label>

            {error && (
              <p className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
                {error}
              </p>
            )}

            <button
              disabled={submitting || unavailableItems.length > 0}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-lora-green px-6 text-sm font-black text-white shadow-green-soft transition hover:bg-lora-dark disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <CreditCard size={18} />
              )}
              {submitting ? "Redirecting..." : "Pay with Paystack"}
            </button>
          </form>
        </section>

        <aside className="h-fit rounded-[30px] bg-white p-5 shadow-soft-card ring-1 ring-slate-100 sm:p-6">
          <h2 className="text-2xl font-black text-slate-950">Order summary</h2>

          <div className="mt-5 grid gap-3">
            {items.map((item, index) => (
              <CheckoutItem key={getProduct(item)?._id || index} item={item} />
            ))}
          </div>

          {unavailableItems.length > 0 && (
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-700">
              Some items are unavailable. Please remove them from your cart.
            </div>
          )}

          <div className="mt-5 rounded-[24px] bg-slate-50 p-4">
            <div className="flex justify-between text-sm font-bold text-slate-500">
              <span>Subtotal</span>
              <span className="font-black text-slate-950">{currency(subtotal)}</span>
            </div>

            <div className="mt-3 flex justify-between text-sm font-bold text-slate-500">
              <span>Tax</span>
              <span>{currency(tax)}</span>
            </div>

            <div className="mt-3 flex justify-between text-sm font-bold text-slate-500">
              <span>Estimated delivery</span>
              <span>{currency(deliveryFee)}</span>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-950">Total</span>
                <span className="text-2xl font-black text-lora-dark">
                  {currency(total)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-xs font-bold text-slate-500">
            <p className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-lora-green" />
              Paystack-secured payment
            </p>

            <p className="flex items-center gap-2">
              <PackageCheck size={15} className="text-lora-green" />
              Delivery tracking starts after payment confirmation
            </p>

            <p className="flex items-center gap-2">
              <Truck size={15} className="text-lora-green" />
              ETA {estimateEta(deliveryServiceType)}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}