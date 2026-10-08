import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  MapPin,
  Search,
  ShieldAlert,
  Star,
  Trash2,
  Truck,
  UserRound,
  X
} from "lucide-react";

import { api, currency, getErrorMessage } from "../lib/api";

function getWorkerId(worker) {
  return worker._id || worker.id;
}

function getWorkerType(worker) {
  return worker.role === "deliveryBoy" ||
    worker.deliveryWorker?.workerType === "deliveryBoy"
    ? "deliveryBoy"
    : "rider";
}

function workerLabel(worker) {
  return getWorkerType(worker) === "deliveryBoy" ? "Delivery boy" : "Rider";
}

function workerIcon(worker) {
  return getWorkerType(worker) === "deliveryBoy" ? Bike : Truck;
}

function getOnline(worker) {
  return Boolean(worker.deliveryWorker?.isOnline || worker.deliveryWorker?.online);
}

function getStatus(worker) {
  if (worker.isSuspended) return "suspended";
  return worker.deliveryWorker?.availabilityStatus || worker.deliveryWorker?.status || "offline";
}

function statusClass(status) {
  if (status === "available") return "bg-emerald-50 text-lora-green";
  if (status === "busy" || status === "delivering") return "bg-blue-50 text-blue-700";
  if (status === "suspended") return "bg-rose-50 text-rose-600";
  return "bg-slate-100 text-slate-600";
}

function getRating(worker) {
  return (
    worker.deliveryWorker?.ratingAverage ||
    worker.deliveryWorker?.rating ||
    worker.ratingAverage ||
    5
  );
}

function getDeliveries(worker) {
  return (
    worker.deliveryWorker?.completedDeliveries ||
    worker.deliveryWorker?.totalDeliveries ||
    0
  );
}

function getEarnings(worker) {
  return (
    worker.deliveryWorker?.totalEarnings ||
    worker.deliveryWorker?.earningsBalance ||
    0
  );
}

function formatLocation(worker) {
  const coords = worker.deliveryWorker?.currentLocation?.coordinates;

  if (!Array.isArray(coords) || coords.length < 2) {
    return "No GPS location";
  }

  return `${Number(coords[1]).toFixed(5)}, ${Number(coords[0]).toFixed(5)}`;
}

function WorkerModal({
  worker,
  onClose,
  onFlag,
  onSuspend,
  onUnsuspend,
  onDelete,
  loading
}) {
  const [reason, setReason] = useState(worker.deliveryWorker?.flagReason || "");
  const Icon = workerIcon(worker);
  const status = getStatus(worker);
  const type = getWorkerType(worker);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-slate-950/45 p-3 backdrop-blur-sm sm:p-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="mx-auto flex min-h-full max-w-4xl items-end justify-center sm:items-center">
          <motion.section
            initial={{ y: 28, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 28, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="max-h-[92vh] w-full overflow-hidden rounded-[30px] bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-lora-green">
                  <Icon size={24} />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-lora-green">
                    {workerLabel(worker)} profile
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    {worker.name}
                  </h2>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(status)}`}>
                      {status}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                      {getOnline(worker) ? "Online" : "Offline"}
                    </span>
                    {worker.deliveryWorker?.isFlagged || worker.deliveryWorker?.flagged ? (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                        Flagged
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="grid h-11 w-11 place-items-center rounded-full bg-slate-50 text-slate-500"
                aria-label="Close worker"
              >
                <X size={20} />
              </button>
            </header>

            <div className="grid max-h-[76vh] gap-5 overflow-y-auto p-5 lg:grid-cols-[1fr_0.85fr]">
              <div className="space-y-5">
                <section className="rounded-[24px] bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <UserRound size={18} className="text-lora-green" />
                    <h3 className="font-black text-slate-950">Account info</h3>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Name
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-950">
                        {worker.name}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Email
                      </p>
                      <p className="mt-1 truncate text-sm font-black text-slate-950">
                        {worker.email}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Phone
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-950">
                        {worker.phone || "Not provided"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Worker type
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-950">
                        {workerLabel(worker)}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[24px] bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <MapPin size={18} className="text-lora-green" />
                    <h3 className="font-black text-slate-950">Delivery coverage</h3>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Current GPS
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-950">
                        {formatLocation(worker)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Radius
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-950">
                        {type === "deliveryBoy"
                          ? `${worker.deliveryWorker?.coverageRadiusKm || 5}km local`
                          : `${worker.deliveryWorker?.maxDeliveryRadiusKm || 150}km flexible`}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 rounded-2xl bg-white p-4 text-sm font-bold leading-6 text-slate-500">
                    {type === "deliveryBoy"
                      ? "Delivery boys only receive nearby local jobs around their current GPS location."
                      : "Riders can handle both short and long distance delivery jobs based on availability."}
                  </p>
                </section>

                <section className="rounded-[24px] bg-slate-50 p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Rating
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1 text-lg font-black text-slate-950">
                        <Star size={17} className="fill-amber-400 text-amber-400" />
                        {Number(getRating(worker)).toFixed(1)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Deliveries
                      </p>
                      <p className="mt-1 text-lg font-black text-slate-950">
                        {getDeliveries(worker)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Earnings
                      </p>
                      <p className="mt-1 text-lg font-black text-slate-950">
                        {currency(getEarnings(worker))}
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              <aside className="space-y-5">
                <section className="rounded-[24px] bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={18} className="text-lora-green" />
                    <h3 className="font-black text-slate-950">Admin action</h3>
                  </div>

                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={5}
                    placeholder="Reason or internal note..."
                    className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-lora-green"
                  />

                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => onFlag(worker, reason)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-amber-50 px-5 text-sm font-black text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                    >
                      {loading ? <Loader2 className="animate-spin" size={17} /> : <AlertTriangle size={17} />}
                      Flag worker
                    </button>

                    {worker.isSuspended ? (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => onUnsuspend(worker)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-lora-green px-5 text-sm font-black text-white transition hover:bg-lora-dark disabled:opacity-60"
                      >
                        {loading ? <Loader2 className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}
                        Unsuspend account
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => onSuspend(worker, reason)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-rose-50 px-5 text-sm font-black text-rose-600 transition hover:bg-rose-100 disabled:opacity-60"
                      >
                        {loading ? <Loader2 className="animate-spin" size={17} /> : <ShieldAlert size={17} />}
                        Suspend account
                      </button>
                    )}
                  </div>
                </section>

                <section className="rounded-[24px] bg-rose-50 p-4">
                  <h3 className="font-black text-rose-900">Danger zone</h3>
                  <p className="mt-1 text-sm font-bold leading-6 text-rose-600">
                    Delete only when this worker account should be removed from
                    the system.
                  </p>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      if (confirm(`Delete ${worker.name}?`)) {
                        onDelete(worker);
                      }
                    }}
                    className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-black text-white transition hover:bg-rose-700 disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="animate-spin" size={17} /> : <Trash2 size={17} />}
                    Delete worker
                  </button>
                </section>
              </aside>
            </div>
          </motion.section>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function AdminRiderManager() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedWorker, setSelectedWorker] = useState(null);

  const {
    data,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ["admin-delivery-workers"],
    queryFn: async () => {
      const res = await api.get("/admin/delivery/workers");
      return res.data;
    }
  });

  const workers = useMemo(() => {
    const list = data?.workers || data?.riders || data?.users || data || [];
    return Array.isArray(list) ? list : [];
  }, [data]);

  const filteredWorkers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return workers.filter((worker) => {
      const type = getWorkerType(worker);
      const status = getStatus(worker);

      if (typeFilter !== "all" && type !== typeFilter) return false;
      if (statusFilter !== "all" && status !== statusFilter) return false;

      if (!query) return true;

      return [
        worker.name,
        worker.email,
        worker.phone,
        workerLabel(worker),
        status,
        formatLocation(worker)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [workers, search, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    return workers.reduce(
      (acc, worker) => {
        const type = getWorkerType(worker);
        const status = getStatus(worker);

        acc.total += 1;
        if (type === "deliveryBoy") acc.deliveryBoys += 1;
        if (type === "rider") acc.riders += 1;
        if (getOnline(worker)) acc.online += 1;
        if (status === "available") acc.available += 1;
        if (worker.isSuspended) acc.suspended += 1;

        return acc;
      },
      {
        total: 0,
        riders: 0,
        deliveryBoys: 0,
        online: 0,
        available: 0,
        suspended: 0
      }
    );
  }, [workers]);

  const actionMutation = useMutation({
    mutationFn: async ({ worker, payload }) => {
      const id = getWorkerId(worker);
      const res = await api.patch(`/admin/delivery/workers/${id}`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-workers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });

      const updatedWorker = data.worker || data.user || data;
      if (updatedWorker?._id) {
        setSelectedWorker(updatedWorker);
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (worker) => {
      const id = getWorkerId(worker);
      const res = await api.delete(`/admin/delivery/workers/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-workers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      setSelectedWorker(null);
    }
  });

  function flagWorker(worker, reason) {
    actionMutation.mutate({
      worker,
      payload: {
        flagged: true,
        isFlagged: true,
        flagReason: reason || "Flagged by admin"
      }
    });
  }

  function suspendWorker(worker, reason) {
    actionMutation.mutate({
      worker,
      payload: {
        isSuspended: true,
        suspensionReason: reason || "Suspended by admin",
        deliveryWorker: {
          ...worker.deliveryWorker,
          availabilityStatus: "suspended",
          status: "suspended",
          isOnline: false,
          online: false
        }
      }
    });
  }

  function unsuspendWorker(worker) {
    actionMutation.mutate({
      worker,
      payload: {
        isSuspended: false,
        suspensionReason: "",
        deliveryWorker: {
          ...worker.deliveryWorker,
          availabilityStatus: "offline",
          status: "offline",
          isOnline: false,
          online: false
        }
      }
    });
  }

  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-soft-card">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-lora-green">
            Delivery team
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            Rider and delivery boy management
          </h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            Riders handle long and short distance jobs. Delivery boys only get
            nearby local jobs from their GPS location.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-[22px] bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Total
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">{stats.total}</p>
        </div>

        <div className="rounded-[22px] bg-emerald-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-lora-green">
            Riders
          </p>
          <p className="mt-2 text-2xl font-black text-lora-green">
            {stats.riders}
          </p>
        </div>

        <div className="rounded-[22px] bg-blue-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">
            Delivery boys
          </p>
          <p className="mt-2 text-2xl font-black text-blue-700">
            {stats.deliveryBoys}
          </p>
        </div>

        <div className="rounded-[22px] bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Online
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {stats.online}
          </p>
        </div>

        <div className="rounded-[22px] bg-emerald-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-lora-green">
            Available
          </p>
          <p className="mt-2 text-2xl font-black text-lora-green">
            {stats.available}
          </p>
        </div>

        <div className="rounded-[22px] bg-rose-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-600">
            Suspended
          </p>
          <p className="mt-2 text-2xl font-black text-rose-600">
            {stats.suspended}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search workers..."
            className="h-12 w-full rounded-full border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-lora-green focus:bg-white"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="h-12 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none transition focus:border-lora-green focus:bg-white"
        >
          <option value="all">All workers</option>
          <option value="rider">Riders</option>
          <option value="deliveryBoy">Delivery boys</option>
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-12 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none transition focus:border-lora-green focus:bg-white"
        >
          <option value="all">All status</option>
          <option value="available">Available</option>
          <option value="busy">Busy</option>
          <option value="delivering">Delivering</option>
          <option value="offline">Offline</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {isLoading ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-[24px] bg-slate-100"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-5 rounded-[24px] bg-rose-50 p-5 text-sm font-bold text-rose-600">
          {getErrorMessage(error)}
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <Bike className="mx-auto text-slate-300" size={42} />
          <h3 className="mt-3 font-black text-slate-950">No workers found</h3>
          <p className="mt-1 text-sm font-bold text-slate-500">
            Riders and delivery boys will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredWorkers.map((worker) => {
            const Icon = workerIcon(worker);
            const status = getStatus(worker);

            return (
              <button
                key={getWorkerId(worker)}
                type="button"
                onClick={() => setSelectedWorker(worker)}
                className="rounded-[24px] border border-slate-100 bg-slate-50 p-4 text-left transition hover:-translate-y-1 hover:bg-white hover:shadow-soft-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-lora-green shadow-sm">
                      <Icon size={22} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">
                        {worker.name}
                      </p>
                      <p className="mt-1 truncate text-xs font-bold text-slate-500">
                        {workerLabel(worker)}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="text-slate-300" size={19} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(status)}`}>
                    {status}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                    {getOnline(worker) ? "Online" : "Offline"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                      Rating
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-sm font-black text-slate-950">
                      <Star size={14} className="fill-amber-400 text-amber-400" />
                      {Number(getRating(worker)).toFixed(1)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                      Jobs
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-950">
                      {getDeliveries(worker)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                      Seen
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-950">
                      {worker.deliveryWorker?.lastSeenAt ? "Live" : "No GPS"}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {actionMutation.isError && (
        <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
          {getErrorMessage(actionMutation.error)}
        </div>
      )}

      {deleteMutation.isError && (
        <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
          {getErrorMessage(deleteMutation.error)}
        </div>
      )}

      {selectedWorker && (
        <WorkerModal
          worker={selectedWorker}
          onClose={() => setSelectedWorker(null)}
          onFlag={flagWorker}
          onSuspend={suspendWorker}
          onUnsuspend={unsuspendWorker}
          onDelete={(worker) => deleteMutation.mutate(worker)}
          loading={actionMutation.isPending || deleteMutation.isPending}
        />
      )}
    </section>
  );
}