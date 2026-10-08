import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bike,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShoppingBag,
  Truck,
  UserRound
} from "lucide-react";
import { signInWithPopup } from "firebase/auth";

import { api, getErrorMessage } from "../lib/api";
import { firebaseAuth, googleProvider } from "../lib/firebase";
import { useAuthStore } from "../store/authStore";

const roles = [
  { value: "customer", label: "Customer", icon: ShoppingBag },
  { value: "rider", label: "Rider", icon: Truck },
  { value: "deliveryBoy", label: "Delivery Boy", icon: Bike }
];

function redirectFor(user) {
  if (user?.role === "admin") return "/admin";
  if (user?.role === "rider" || user?.role === "deliveryBoy") return "/rider";
  return "/";
}

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "customer"
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loadingType, setLoadingType] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);

  const isLogin = mode === "login";
  const loading = Boolean(loadingType);

  useEffect(() => {
    if (user) {
      navigate(redirectFor(user), { replace: true });
    }
  }, [navigate, user]);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
  }

  async function finishAuth(data) {
    setSession(data.user, data.accessToken, data.refreshToken);
    navigate(redirectFor(data.user), { replace: true });
  }

  async function handleEmailAuth(event) {
    event.preventDefault();
    setError("");
    setLoadingType("email");

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";

      const payload = isLogin
        ? {
            email: form.email,
            password: form.password
          }
        : {
            name: form.name,
            email: form.email,
            phone: form.phone,
            password: form.password,
            role: form.role
          };

      const { data } = await api.post(endpoint, payload);
      await finishAuth(data);
    } catch (err) {
      setError(getErrorMessage(err, "Authentication failed"));
    } finally {
      setLoadingType("");
    }
  }

  async function handleGoogleAuth() {
    setError("");
    setLoadingType("google");

    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const idToken = await result.user.getIdToken();

      const { data } = await api.post("/auth/google", { idToken });
      await finishAuth(data);
    } catch (err) {
      setError(
        err.code === "auth/popup-blocked"
          ? "Your browser blocked the Google popup. Allow popups and try again."
          : getErrorMessage(err, "Google login failed")
      );
    } finally {
      setLoadingType("");
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8f4] p-4 sm:p-6">
      <section className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[32px] bg-white shadow-card ring-1 ring-slate-100 lg:grid-cols-[1fr_480px]">
        <div className="relative hidden overflow-hidden bg-lora-mist lg:block">
          <img
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=90"
            alt="Fresh groceries"
            className="h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-lora-dark/55 via-lora-dark/18 to-transparent" />

          <div className="absolute left-8 top-8 flex items-center gap-3 text-white">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lora-green text-xl font-black">
              L
            </span>
            <div>
              <p className="text-2xl font-black">Lo'ra</p>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/75">
                Groceries
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-5 sm:p-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="w-full max-w-md"
          >
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lora-green text-xl font-black text-white">
                L
              </span>
              <div>
                <p className="text-2xl font-black text-slate-950">Lo'ra</p>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Groceries
                </p>
              </div>
            </div>

            <p className="text-xs font-black uppercase tracking-[0.18em] text-lora-green">
              {isLogin ? "Welcome back" : "Create account"}
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
              {isLogin ? "Sign in" : "Register"}
            </h1>

            <div className="mt-7 flex rounded-2xl bg-lora-mist p-1">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`h-12 flex-1 rounded-xl text-sm font-black transition ${
                  isLogin
                    ? "bg-white text-lora-green shadow-sm"
                    : "text-slate-500"
                }`}
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`h-12 flex-1 rounded-xl text-sm font-black transition ${
                  !isLogin
                    ? "bg-white text-lora-green shadow-sm"
                    : "text-slate-500"
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleEmailAuth} className="mt-6 grid gap-4">
              {!isLogin && (
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">
                    Full name
                  </span>
                  <div className="relative">
                    <UserRound
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      name="name"
                      value={form.name}
                      onChange={updateField}
                      required
                      placeholder="Enter your name"
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-bold outline-none focus:border-lora-green focus:bg-white focus:ring-4 focus:ring-lora-green/10"
                    />
                  </div>
                </label>
              )}

              {!isLogin && (
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">
                    Phone number
                  </span>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={updateField}
                    placeholder="Optional"
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-lora-green focus:bg-white focus:ring-4 focus:ring-lora-green/10"
                  />
                </label>
              )}

              {!isLogin && (
                <div className="grid gap-2">
                  <span className="text-sm font-black text-slate-700">
                    Account type
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    {roles.map((role) => {
                      const Icon = role.icon;
                      const active = form.role === role.value;

                      return (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              role: role.value
                            }))
                          }
                          className={`rounded-2xl border p-3 text-left transition ${
                            active
                              ? "border-lora-green bg-emerald-50 text-lora-green"
                              : "border-slate-100 bg-white text-slate-500"
                          }`}
                        >
                          <Icon size={18} />
                          <p className="mt-2 text-xs font-black">
                            {role.label}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">
                  Email address
                </span>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={updateField}
                    required
                    placeholder="you@example.com"
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-bold outline-none focus:border-lora-green focus:bg-white focus:ring-4 focus:ring-lora-green/10"
                  />
                </div>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-black text-slate-700">
                  Password
                </span>
                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={updateField}
                    required
                    placeholder="Enter password"
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-sm font-bold outline-none focus:border-lora-green focus:bg-white focus:ring-4 focus:ring-lora-green/10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              {error && (
                <p className="rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-600">
                  {error}
                </p>
              )}

              <button
                disabled={loading}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-lora-green text-sm font-black text-white shadow-green-soft transition hover:bg-lora-dark disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loadingType === "email" && (
                  <Loader2 size={18} className="animate-spin" />
                )}
                {loadingType === "email"
                  ? "Please wait..."
                  : isLogin
                    ? "Sign in"
                    : "Create account"}
              </button>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="inline-flex h-14 items-center justify-center gap-3 rounded-full border border-slate-200 bg-white text-sm font-black text-slate-900 transition hover:border-lora-green hover:text-lora-green disabled:bg-slate-100"
              >
                {loadingType === "google" ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-sm">
                    G
                  </span>
                )}
                Continue with Google
              </button>
            </form>
          </motion.div>
        </div>
      </section>
    </main>
  );
}