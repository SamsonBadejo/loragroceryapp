import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  ShoppingBag,
  UserRound
} from "lucide-react";

import { api, getErrorMessage } from "../lib/api";
import { useAuthStore } from "../store/authStore";

function getAvatarUrl(user) {
  const avatar = user?.avatar || user?.profileImage;

  if (!avatar) return "";
  if (typeof avatar === "string") return avatar;

  return avatar.secure_url || avatar.url || "";
}

function getInitials(name = "") {
  const parts = name.trim().split(" ").filter(Boolean);

  if (!parts.length) return "L";

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function firstName(name = "") {
  return name.trim().split(" ")[0] || "there";
}

function accountLabel(role) {
  if (role === "deliveryBoy") return "Delivery Boy";
  if (role === "rider") return "Rider";
  if (role === "admin") return "Admin";
  return "Customer";
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center gap-2 text-sm font-black text-slate-700">
        <Icon size={16} className="text-lora-green" />
        {label}
      </span>
      {children}
    </label>
  );
}

function Notice({ type = "success", children }) {
  const styles =
    type === "error"
      ? "bg-rose-50 text-rose-600"
      : "bg-emerald-50 text-lora-green";

  return (
    <motion.p
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-4 text-sm font-bold ${styles}`}
    >
      {children}
    </motion.p>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={`h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-lora-green focus:bg-white focus:ring-4 focus:ring-lora-green/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
        props.className || ""
      }`}
    />
  );
}

export default function ProfileSettings() {
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);

  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || ""
  });

  const [preview, setPreview] = useState(getAvatarUrl(user));
  const [avatarFile, setAvatarFile] = useState(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  const avatar = useMemo(() => preview || getAvatarUrl(user), [preview, user]);
  const hasPassword = Boolean(user?.hasPassword);
  const isGoogleAccount = Boolean(user?.googleId);
  const needsPasswordSetup = isGoogleAccount && !hasPassword;

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function updatePasswordField(name, value) {
    setPasswordForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function updateStoredUser(nextUser) {
    setSession(
      {
        ...user,
        ...nextUser
      },
      accessToken,
      refreshToken
    );
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileError("Please choose a valid image file.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setProfileError("Profile image must be less than 3MB.");
      return;
    }

    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
    setProfileError("");
  }

  async function submitProfile(event) {
    event.preventDefault();

    setSavingProfile(true);
    setProfileMessage("");
    setProfileError("");

    try {
      const profilePayload = {
        name: form.name.trim(),
        phone: form.phone.trim()
      };

      const profileResponse = await api.patch("/users/profile", profilePayload);

      let nextUser = profileResponse.data.user || profileResponse.data;

      if (avatarFile) {
        const body = new FormData();
        body.append("avatar", avatarFile);

        const avatarResponse = await api.patch("/users/avatar", body, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });

        nextUser = avatarResponse.data.user || nextUser;
      }

      updateStoredUser(nextUser);
      setAvatarFile(null);
      setProfileMessage("Profile updated successfully.");
    } catch (err) {
      setProfileError(getErrorMessage(err, "Profile could not be updated."));
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitPassword(event) {
    event.preventDefault();

    setSavingPassword(true);
    setPasswordMessage("");
    setPasswordError("");

    try {
      if (passwordForm.newPassword.length < 8) {
        throw new Error("New password must be at least 8 characters.");
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error("New password and confirmation do not match.");
      }

      if (hasPassword && !passwordForm.currentPassword) {
        throw new Error("Current password is required.");
      }

      const { data } = await api.patch("/auth/password", {
        currentPassword: hasPassword ? passwordForm.currentPassword : "",
        newPassword: passwordForm.newPassword
      });

      updateStoredUser({
        ...(data.user || {}),
        hasPassword: true
      });

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });

      setPasswordMessage(
        hasPassword
          ? "Password updated successfully."
          : "Password set successfully. You can now sign in with email and password too."
      );
    } catch (err) {
      setPasswordError(getErrorMessage(err, err.message || "Password could not be updated."));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-28 pt-24 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-soft-card">
        <div className="relative overflow-hidden bg-lora-dark px-5 py-8 text-white sm:px-8">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-lora-green/30 blur-3xl" />
          <div className="absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-lora-lime/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-lora-lime">
                Account Settings
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Hello, {firstName(user?.name)}
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/70">
                Manage your profile, profile picture, phone number, and account
                security.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white">
              <ShieldCheck size={17} className="text-lora-lime" />
              {isGoogleAccount ? "Google connected" : "Email account"}
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[330px_1fr]">
          <aside className="h-fit rounded-[28px] border border-slate-100 bg-slate-50 p-5">
            <div className="flex flex-col items-center text-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative"
                aria-label="Change profile picture"
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt={user?.name || "Profile"}
                    className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-card"
                  />
                ) : (
                  <div className="grid h-32 w-32 place-items-center rounded-full border-4 border-white bg-lora-green text-4xl font-black text-white shadow-card">
                    {getInitials(user?.name)}
                  </div>
                )}

                <span className="absolute bottom-1 right-2 grid h-10 w-10 place-items-center rounded-full bg-lora-green text-white shadow-green-soft transition group-hover:bg-lora-dark">
                  <Camera size={18} />
                </span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />

              <h2 className="mt-5 text-2xl font-black text-slate-950">
                {user?.name || "Lo'ra User"}
              </h2>

              <p className="mt-1 break-all text-sm font-bold text-slate-500">
                {user?.email}
              </p>

              <div className="mt-5 grid w-full gap-3">
                <div className="rounded-[22px] bg-white p-4 text-left">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Account type
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    {accountLabel(user?.role)}
                  </p>
                </div>

                <div className="rounded-[22px] bg-white p-4 text-left">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Login method
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    {isGoogleAccount && hasPassword
                      ? "Google + Password"
                      : isGoogleAccount
                        ? "Google"
                        : "Password"}
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <section className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-soft-card">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-lora-green">
                  <ShoppingBag size={20} />
                </div>
                <p className="mt-4 text-2xl font-black text-slate-950">
                  {Number(user?.totalOrders || user?.ordersCount || 0)}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Total orders
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-soft-card">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-lora-green">
                  <ShieldCheck size={20} />
                </div>
                <p className="mt-4 text-2xl font-black text-slate-950">
                  Active
                </p>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Account status
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-soft-card">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-lora-green">
                  <LockKeyhole size={20} />
                </div>
                <p className="mt-4 text-2xl font-black text-slate-950">
                  {hasPassword ? "Set" : "Not set"}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Password
                </p>
              </div>
            </div>

            <form
              onSubmit={submitProfile}
              className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-soft-card sm:p-6"
            >
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-950">
                  Personal information
                </h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  Keep your details updated for delivery calls and order
                  notifications.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" icon={UserRound}>
                  <Input
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </Field>

                <Field label="Phone number" icon={Phone}>
                  <Input
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    placeholder="+234..."
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Email address" icon={Mail}>
                    <Input value={form.email} disabled />
                  </Field>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {profileMessage && <Notice>{profileMessage}</Notice>}
                {profileError && <Notice type="error">{profileError}</Notice>}
              </div>

              <motion.button
                type="submit"
                disabled={savingProfile}
                whileTap={{ scale: 0.98 }}
                className="mt-6 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-lora-green px-6 text-sm font-black text-white shadow-green-soft transition hover:bg-lora-dark disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                <Save size={17} />
                {savingProfile ? "Saving..." : "Save profile"}
              </motion.button>
            </form>

            <form
              onSubmit={submitPassword}
              className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-soft-card sm:p-6"
            >
              <div className="mb-6 flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-lora-green">
                  <LockKeyhole size={21} />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    {hasPassword ? "Change password" : "Set password"}
                  </h2>

                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    {needsPasswordSetup
                      ? "Your account uses Google. You can set a password if you also want email login."
                      : "Use a strong password to keep your Lo'ra account secure."}
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                {hasPassword && (
                  <Field label="Current password" icon={LockKeyhole}>
                    <Input
                      type={showPasswords ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(event) =>
                        updatePasswordField("currentPassword", event.target.value)
                      }
                      placeholder="Enter current password"
                    />
                  </Field>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="New password" icon={LockKeyhole}>
                    <Input
                      type={showPasswords ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        updatePasswordField("newPassword", event.target.value)
                      }
                      placeholder="At least 8 characters"
                    />
                  </Field>

                  <Field label="Confirm password" icon={LockKeyhole}>
                    <Input
                      type={showPasswords ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(event) =>
                        updatePasswordField("confirmPassword", event.target.value)
                      }
                      placeholder="Repeat new password"
                    />
                  </Field>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPasswords((current) => !current)}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-emerald-50 hover:text-lora-green"
              >
                {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                {showPasswords ? "Hide passwords" : "Show passwords"}
              </button>

              <div className="mt-5 grid gap-3">
                {passwordMessage && <Notice>{passwordMessage}</Notice>}
                {passwordError && <Notice type="error">{passwordError}</Notice>}
              </div>

              <motion.button
                type="submit"
                disabled={savingPassword}
                whileTap={{ scale: 0.98 }}
                className="mt-6 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-lora-dark px-6 text-sm font-black text-white shadow-card transition hover:bg-lora-green disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                <CheckCircle2 size={17} />
                {savingPassword
                  ? "Saving..."
                  : hasPassword
                    ? "Update password"
                    : "Set password"}
              </motion.button>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}