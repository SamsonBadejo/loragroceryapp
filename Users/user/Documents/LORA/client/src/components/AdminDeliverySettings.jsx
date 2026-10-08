import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bike,
  Calculator,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  Save,
  Settings,
  Truck
} from "lucide-react";

import { api, currency, getErrorMessage } from "../lib/api";

const defaultSettings = {
  rider: {
    enabled: true,
    maxRadiusKm: 150,
    customerBaseFee: 1500,
    customerMidFee: 2500,
    customerBaseKm: 5,
    customerMidKm: 10,
    customerPerKmAfterMid: 300,
    payoutBase: 1000,
    payoutBaseKm: 3,
    payoutPerKmAfterBase: 150
  },
  deliveryBoy: {
    enabled: true,
    maxRadiusKm: 20,
    localRadiusKm: 5,
    fee0To3Km: 700,
    fee3To5Km: 900,
    payout0To3Km: 500,
    payout3To5Km: 650,
    extraKmFee: 250,
    extraKmPayout: 120
  },
  surge: {
    rain: 0,
    traffic: 0,
    peakHour: 0
  }
};

function mergeSettings(value) {
  return {
    rider: {
      ...defaultSettings.rider,
      ...(value?.rider || {})
    },
    deliveryBoy: {
      ...defaultSettings.deliveryBoy,
      ...(value?.deliveryBoy || {})
    },
    surge: {
      ...defaultSettings.surge,
      ...(value?.surge || {})
    }
  };
}

function numberValue(value) {
  return Number(value || 0);
}

function calculateQuote(settings, serviceType, distanceKm) {
  const distance = Number(distanceKm || 0);
  const surgeMultiplier =
    1 +
    numberValue(settings.surge.rain) / 100 +
    numberValue(settings.surge.traffic) / 100 +
    numberValue(settings.surge.peakHour) / 100;

  if (serviceType === "deliveryBoy") {
    let customerPrice = 0;
    let payout = 0;

    if (distance <= 3) {
      customerPrice = numberValue(settings.deliveryBoy.fee0To3Km);
      payout = numberValue(settings.deliveryBoy.payout0To3Km);
    } else if (distance <= 5) {
      customerPrice = numberValue(settings.deliveryBoy.fee3To5Km);
      payout = numberValue(settings.deliveryBoy.payout3To5Km);
    } else {
      customerPrice =
        numberValue(settings.deliveryBoy.fee3To5Km) +
        (distance - 5) * numberValue(settings.deliveryBoy.extraKmFee);

      payout =
        numberValue(settings.deliveryBoy.payout3To5Km) +
        (distance - 5) * numberValue(settings.deliveryBoy.extraKmPayout);
    }

    customerPrice = Math.round(customerPrice * surgeMultiplier);

    return {
      customerPrice,
      payout: Math.round(payout),
      margin: Math.round(customerPrice - payout)
    };
  }

  let customerPrice = 0;

  if (distance <= settings.rider.customerBaseKm) {
    customerPrice = numberValue(settings.rider.customerBaseFee);
  } else if (distance <= settings.rider.customerMidKm) {
    customerPrice = numberValue(settings.rider.customerMidFee);
  } else {
    customerPrice =
      numberValue(settings.rider.customerMidFee) +
      (distance - numberValue(settings.rider.customerMidKm)) *
        numberValue(settings.rider.customerPerKmAfterMid);
  }

  customerPrice = Math.round(customerPrice * surgeMultiplier);

  const payout =
    numberValue(settings.rider.payoutBase) +
    Math.max(0, distance - numberValue(settings.rider.payoutBaseKm)) *
      numberValue(settings.rider.payoutPerKmAfterBase);

  return {
    customerPrice,
    payout: Math.round(payout),
    margin: Math.round(customerPrice - payout)
  };
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function NumberInput({ value, onChange, prefix }) {
  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
          {prefix}
        </span>
      )}
      <input
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-lora-green ${
          prefix ? "pl-9" : ""
        }`}
      />
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex h-12 items-center justify-between rounded-2xl px-4 text-sm font-black transition ${
        checked
          ? "bg-emerald-50 text-lora-green"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {label}
      <span
        className={`h-6 w-11 rounded-full p-1 transition ${
          checked ? "bg-lora-green" : "bg-slate-300"
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

export function AdminDeliverySettings() {
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState(defaultSettings);
  const [quoteType, setQuoteType] = useState("rider");
  const [quoteDistance, setQuoteDistance] = useState(8);

  const {
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ["admin-delivery-settings"],
    queryFn: async () => {
      const res = await api.get("/admin/delivery/settings");
      const nextSettings = mergeSettings(res.data?.settings || res.data);
      setSettings(nextSettings);
      return nextSettings;
    },
    retry: 1
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.patch("/admin/delivery/settings", payload);
      return res.data;
    },
    onSuccess: (data) => {
      const nextSettings = mergeSettings(data.settings || data);
      setSettings(nextSettings);
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-settings"] });
    }
  });

  const quote = useMemo(() => {
    return calculateQuote(settings, quoteType, quoteDistance);
  }, [settings, quoteType, quoteDistance]);

  function update(section, field, value) {
    setSettings((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]:
          typeof current[section][field] === "boolean"
            ? value
            : value === ""
              ? ""
              : Number(value)
      }
    }));
  }

  function resetDefaults() {
    if (confirm("Reset delivery settings to defaults?")) {
      setSettings(defaultSettings);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-soft-card">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-lora-green">
              Delivery pricing
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              Rider and delivery boy settings
            </h2>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
              Control delivery pricing, worker payout, service radius and surge
              pricing. Riders can take long and short trips. Delivery boys stay
              local.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={resetDefaults}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-100 px-5 text-sm font-black text-slate-700"
            >
              <RefreshCcw size={17} />
              Defaults
            </button>

            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate(settings)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-lora-green px-5 text-sm font-black text-white shadow-green-soft transition hover:bg-lora-dark disabled:opacity-60"
            >
              {saveMutation.isPending ? (
                <Loader2 className="animate-spin" size={17} />
              ) : (
                <Save size={17} />
              )}
              Save settings
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
            Loading delivery settings...
          </div>
        )}

        {isError && (
          <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} />
              {getErrorMessage(error)}
            </div>
          </div>
        )}

        {saveMutation.isError && (
          <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} />
              {getErrorMessage(saveMutation.error)}
            </div>
          </div>
        )}

        {saveMutation.isSuccess && (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-lora-green">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} />
              Delivery settings saved.
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-soft-card">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-lora-green">
              <Truck size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-950">
                Rider pricing
              </h3>
              <p className="text-sm font-bold text-slate-500">
                Long and short distance delivery
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Toggle
              checked={settings.rider.enabled}
              onChange={(value) => update("rider", "enabled", value)}
              label="Rider service"
            />

            <Field label="Max radius KM">
              <NumberInput
                value={settings.rider.maxRadiusKm}
                onChange={(value) => update("rider", "maxRadiusKm", value)}
              />
            </Field>

            <Field label="0 to 5km customer fee">
              <NumberInput
                prefix="₦"
                value={settings.rider.customerBaseFee}
                onChange={(value) => update("rider", "customerBaseFee", value)}
              />
            </Field>

            <Field label="5 to 10km customer fee">
              <NumberInput
                prefix="₦"
                value={settings.rider.customerMidFee}
                onChange={(value) => update("rider", "customerMidFee", value)}
              />
            </Field>

            <Field label="Base KM">
              <NumberInput
                value={settings.rider.customerBaseKm}
                onChange={(value) => update("rider", "customerBaseKm", value)}
              />
            </Field>

            <Field label="Mid KM">
              <NumberInput
                value={settings.rider.customerMidKm}
                onChange={(value) => update("rider", "customerMidKm", value)}
              />
            </Field>

            <Field label="Customer fee per km after 10km">
              <NumberInput
                prefix="₦"
                value={settings.rider.customerPerKmAfterMid}
                onChange={(value) =>
                  update("rider", "customerPerKmAfterMid", value)
                }
              />
            </Field>

            <Field label="Rider base payout">
              <NumberInput
                prefix="₦"
                value={settings.rider.payoutBase}
                onChange={(value) => update("rider", "payoutBase", value)}
              />
            </Field>

            <Field label="Payout base KM">
              <NumberInput
                value={settings.rider.payoutBaseKm}
                onChange={(value) => update("rider", "payoutBaseKm", value)}
              />
            </Field>

            <Field label="Payout per km after base">
              <NumberInput
                prefix="₦"
                value={settings.rider.payoutPerKmAfterBase}
                onChange={(value) =>
                  update("rider", "payoutPerKmAfterBase", value)
                }
              />
            </Field>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-soft-card">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <Bike size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-950">
                Delivery boy pricing
              </h3>
              <p className="text-sm font-bold text-slate-500">
                Local nearby delivery only
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Toggle
              checked={settings.deliveryBoy.enabled}
              onChange={(value) => update("deliveryBoy", "enabled", value)}
              label="Delivery boy service"
            />

            <Field label="Max radius KM">
              <NumberInput
                value={settings.deliveryBoy.maxRadiusKm}
                onChange={(value) =>
                  update("deliveryBoy", "maxRadiusKm", value)
                }
              />
            </Field>

            <Field label="Local radius KM">
              <NumberInput
                value={settings.deliveryBoy.localRadiusKm}
                onChange={(value) =>
                  update("deliveryBoy", "localRadiusKm", value)
                }
              />
            </Field>

            <Field label="0 to 3km customer fee">
              <NumberInput
                prefix="₦"
                value={settings.deliveryBoy.fee0To3Km}
                onChange={(value) => update("deliveryBoy", "fee0To3Km", value)}
              />
            </Field>

            <Field label="3 to 5km customer fee">
              <NumberInput
                prefix="₦"
                value={settings.deliveryBoy.fee3To5Km}
                onChange={(value) => update("deliveryBoy", "fee3To5Km", value)}
              />
            </Field>

            <Field label="0 to 3km payout">
              <NumberInput
                prefix="₦"
                value={settings.deliveryBoy.payout0To3Km}
                onChange={(value) =>
                  update("deliveryBoy", "payout0To3Km", value)
                }
              />
            </Field>

            <Field label="3 to 5km payout">
              <NumberInput
                prefix="₦"
                value={settings.deliveryBoy.payout3To5Km}
                onChange={(value) =>
                  update("deliveryBoy", "payout3To5Km", value)
                }
              />
            </Field>

            <Field label="Extra km customer fee">
              <NumberInput
                prefix="₦"
                value={settings.deliveryBoy.extraKmFee}
                onChange={(value) =>
                  update("deliveryBoy", "extraKmFee", value)
                }
              />
            </Field>

            <Field label="Extra km payout">
              <NumberInput
                prefix="₦"
                value={settings.deliveryBoy.extraKmPayout}
                onChange={(value) =>
                  update("deliveryBoy", "extraKmPayout", value)
                }
              />
            </Field>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-soft-card">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-700">
              <Settings size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-950">
                Surge pricing
              </h3>
              <p className="text-sm font-bold text-slate-500">
                Percentage added to customer delivery fee
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <Field label="Rain surge %">
              <NumberInput
                value={settings.surge.rain}
                onChange={(value) => update("surge", "rain", value)}
              />
            </Field>

            <Field label="Traffic surge %">
              <NumberInput
                value={settings.surge.traffic}
                onChange={(value) => update("surge", "traffic", value)}
              />
            </Field>

            <Field label="Peak hour surge %">
              <NumberInput
                value={settings.surge.peakHour}
                onChange={(value) => update("surge", "peakHour", value)}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-soft-card">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-lora-green">
              <Calculator size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-950">
                Quote tester
              </h3>
              <p className="text-sm font-bold text-slate-500">
                Preview what customers pay and workers earn
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Service type">
              <select
                value={quoteType}
                onChange={(event) => setQuoteType(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 outline-none focus:border-lora-green"
              >
                <option value="rider">Rider</option>
                <option value="deliveryBoy">Delivery boy</option>
              </select>
            </Field>

            <Field label="Distance KM">
              <NumberInput
                value={quoteDistance}
                onChange={(value) => setQuoteDistance(value)}
              />
            </Field>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Customer pays
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {currency(quote.customerPrice)}
              </p>
            </div>

            <div className="rounded-[22px] bg-emerald-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-lora-green">
                Worker payout
              </p>
              <p className="mt-2 text-2xl font-black text-lora-green">
                {currency(quote.payout)}
              </p>
            </div>

            <div className="rounded-[22px] bg-blue-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">
                Platform margin
              </p>
              <p className="mt-2 text-2xl font-black text-blue-700">
                {currency(quote.margin)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[22px] bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-500">
            Delivery boys should stay around local jobs. Riders remain the
            flexible option for longer distance deliveries.
          </div>
        </section>
      </div>
    </section>
  );
}