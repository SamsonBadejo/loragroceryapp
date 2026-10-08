import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Image as ImageIcon,
  Loader2,
  MessageSquareWarning,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
  XCircle
} from "lucide-react";

import { api, getErrorMessage } from "../lib/api";

const statusOptions = ["all", "open", "reviewing", "resolved", "rejected"];

function getComplaintId(complaint) {
  return complaint._id || complaint.id;
}

function getCustomer(complaint) {
  return complaint.user || complaint.customer || {};
}

function getCustomerName(complaint) {
  const customer = getCustomer(complaint);
  return customer.name || complaint.customerName || "Customer";
}

function getOrderNumber(complaint) {
  return (
    complaint.order?.orderNumber ||
    complaint.orderNumber ||
    (complaint.order ? `Order #${String(complaint.order).slice(-6)}` : "No order")
  );
}

function getStatus(complaint) {
  return complaint.status || "open";
}

function statusClass(status) {
  if (status === "resolved") return "bg-emerald-50 text-lora-green";
  if (status === "rejected") return "bg-rose-50 text-rose-600";
  if (status === "reviewing") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
}

function statusIcon(status) {
  if (status === "resolved") return CheckCircle2;
  if (status === "rejected") return XCircle;
  if (status === "reviewing") return Clock3;
  return AlertTriangle;
}

function getTypeLabel(type) {
  const value = type || "complaint";

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ComplaintModal({
  complaint,
  onClose,
  onAction,
  onDelete,
  actionLoading,
  deleteLoading
}) {
  const [adminNote, setAdminNote] = useState(complaint.adminNote || "");
  const status = getStatus(complaint);
  const StatusIcon = statusIcon(status);
  const customer = getCustomer(complaint);
  const images = complaint.images || complaint.evidenceImages || complaint.evidence || [];

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
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-lora-green">
                  Complaint review
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  {getTypeLabel(complaint.type || complaint.reason)}
                </h2>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${statusClass(status)}`}>
                    <StatusIcon size={14} />
                    {status}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {getOrderNumber(complaint)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="grid h-11 w-11 place-items-center rounded-full bg-slate-50 text-slate-500"
                aria-label="Close complaint"
              >
                <X size={20} />
              </button>
            </header>

            <div className="grid max-h-[76vh] gap-5 overflow-y-auto p-5 lg:grid-cols-[1fr_0.85fr]">
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
                        {customer.name || getCustomerName(complaint)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Email
                      </p>
                      <p className="mt-1 truncate text-sm font-black text-slate-950">
                        {customer.email || "Not provided"}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[24px] bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <MessageSquareWarning size={18} className="text-lora-green" />
                    <h3 className="font-black text-slate-950">Message</h3>
                  </div>

                  <p className="mt-4 rounded-2xl bg-white p-4 text-sm font-bold leading-6 text-slate-600">
                    {complaint.message ||
                      complaint.description ||
                      complaint.comment ||
                      "No complaint message was provided."}
                  </p>
                </section>

                <section className="rounded-[24px] bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={18} className="text-lora-green" />
                    <h3 className="font-black text-slate-950">Evidence</h3>
                  </div>

                  {images.length ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {images.map((image, index) => {
                        const url = image.url || image;

                        return (
                          <a
                            key={`${url}-${index}`}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="aspect-square overflow-hidden rounded-2xl bg-white"
                          >
                            <img
                              src={url}
                              alt="Complaint evidence"
                              className="h-full w-full object-cover"
                            />
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-2xl bg-white p-4 text-sm font-bold text-slate-500">
                      No evidence image was uploaded.
                    </p>
                  )}
                </section>
              </div>

              <aside className="space-y-5">
                <section className="rounded-[24px] bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-lora-green" />
                    <h3 className="font-black text-slate-950">Admin decision</h3>
                  </div>

                  <textarea
                    value={adminNote}
                    onChange={(event) => setAdminNote(event.target.value)}
                    rows={6}
                    placeholder="Write a short note for this complaint..."
                    className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-lora-green"
                  />

                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() =>
                        onAction(complaint, {
                          status: "reviewing",
                          adminNote
                        })
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-blue-50 px-5 text-sm font-black text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
                    >
                      {actionLoading ? <Loader2 className="animate-spin" size={17} /> : <Clock3 size={17} />}
                      Mark reviewing
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() =>
                        onAction(complaint, {
                          status: "resolved",
                          adminNote
                        })
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-lora-green px-5 text-sm font-black text-white transition hover:bg-lora-dark disabled:opacity-60"
                    >
                      {actionLoading ? <Loader2 className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}
                      Resolve complaint
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() =>
                        onAction(complaint, {
                          status: "rejected",
                          adminNote
                        })
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-rose-50 px-5 text-sm font-black text-rose-600 transition hover:bg-rose-100 disabled:opacity-60"
                    >
                      {actionLoading ? <Loader2 className="animate-spin" size={17} /> : <XCircle size={17} />}
                      Reject complaint
                    </button>
                  </div>
                </section>

                <section className="rounded-[24px] bg-rose-50 p-4">
                  <h3 className="font-black text-rose-900">Danger zone</h3>
                  <p className="mt-1 text-sm font-bold leading-6 text-rose-600">
                    Delete this complaint only when it is spam or no longer
                    needed.
                  </p>

                  <button
                    type="button"
                    disabled={deleteLoading}
                    onClick={() => {
                      if (confirm("Delete this complaint permanently?")) {
                        onDelete(complaint);
                      }
                    }}
                    className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-black text-white transition hover:bg-rose-700 disabled:opacity-60"
                  >
                    {deleteLoading ? <Loader2 className="animate-spin" size={17} /> : <Trash2 size={17} />}
                    Delete complaint
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

export default function AdminComplaintsManager() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const {
    data,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ["admin-complaints"],
    queryFn: async () => {
      const res = await api.get("/complaints");
      return res.data;
    }
  });

  const complaints = useMemo(() => {
    const list = data?.complaints || data?.items || data?.data || data || [];
    return Array.isArray(list) ? list : [];
  }, [data]);

  const filteredComplaints = useMemo(() => {
    const query = search.trim().toLowerCase();

    return complaints.filter((complaint) => {
      const status = getStatus(complaint);

      if (statusFilter !== "all" && status !== statusFilter) {
        return false;
      }

      if (!query) return true;

      return [
        getCustomerName(complaint),
        getOrderNumber(complaint),
        complaint.type,
        complaint.reason,
        complaint.message,
        complaint.description,
        status
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [complaints, search, statusFilter]);

  const stats = useMemo(() => {
    return complaints.reduce(
      (acc, complaint) => {
        const status = getStatus(complaint);
        acc.total += 1;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {
        total: 0,
        open: 0,
        reviewing: 0,
        resolved: 0,
        rejected: 0
      }
    );
  }, [complaints]);

  const actionMutation = useMutation({
    mutationFn: async ({ complaint, payload }) => {
      const id = getComplaintId(complaint);
      const res = await api.patch(`/complaints/${id}`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-complaints"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });

      const updatedComplaint = data.complaint || data;
      if (updatedComplaint?._id) {
        setSelectedComplaint(updatedComplaint);
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (complaint) => {
      const id = getComplaintId(complaint);
      const res = await api.delete(`/complaints/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-complaints"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      setSelectedComplaint(null);
    }
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete("/complaints");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-complaints"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      setSelectedComplaint(null);
    }
  });

  function runAction(complaint, payload) {
    actionMutation.mutate({
      complaint,
      payload
    });
  }

  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-soft-card">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-lora-green">
            Complaints
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            Complaint management
          </h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            Review customer reports, resolve issues, reject invalid complaints
            and delete old records.
          </p>
        </div>

        <button
          type="button"
          disabled={!complaints.length || clearAllMutation.isPending}
          onClick={() => {
            if (confirm("Delete all complaints permanently?")) {
              clearAllMutation.mutate();
            }
          }}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-rose-50 px-5 text-sm font-black text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {clearAllMutation.isPending ? (
            <Loader2 className="animate-spin" size={17} />
          ) : (
            <Trash2 size={17} />
          )}
          Clear all
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[22px] bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Total
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">{stats.total}</p>
        </div>

        <div className="rounded-[22px] bg-amber-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-600">
            Open
          </p>
          <p className="mt-2 text-2xl font-black text-amber-700">{stats.open}</p>
        </div>

        <div className="rounded-[22px] bg-blue-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">
            Reviewing
          </p>
          <p className="mt-2 text-2xl font-black text-blue-700">
            {stats.reviewing}
          </p>
        </div>

        <div className="rounded-[22px] bg-emerald-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-lora-green">
            Resolved
          </p>
          <p className="mt-2 text-2xl font-black text-lora-green">
            {stats.resolved}
          </p>
        </div>

        <div className="rounded-[22px] bg-rose-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-600">
            Rejected
          </p>
          <p className="mt-2 text-2xl font-black text-rose-600">
            {stats.rejected}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search complaints..."
            className="h-12 w-full rounded-full border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-lora-green focus:bg-white"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-12 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none transition focus:border-lora-green focus:bg-white"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status === "all" ? "All statuses" : status}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
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
      ) : filteredComplaints.length === 0 ? (
        <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <MessageSquareWarning className="mx-auto text-slate-300" size={42} />
          <h3 className="mt-3 font-black text-slate-950">
            No complaints found
          </h3>
          <p className="mt-1 text-sm font-bold text-slate-500">
            Customer complaints will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-100">
          <div className="divide-y divide-slate-100">
            {filteredComplaints.map((complaint) => {
              const status = getStatus(complaint);
              const StatusIcon = statusIcon(status);

              return (
                <button
                  key={getComplaintId(complaint)}
                  type="button"
                  onClick={() => setSelectedComplaint(complaint)}
                  className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50 lg:grid-cols-[1fr_1fr_130px_44px] lg:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">
                      {getTypeLabel(complaint.type || complaint.reason)}
                    </p>
                    <p className="mt-1 truncate text-xs font-bold text-slate-500">
                      {complaint.message ||
                        complaint.description ||
                        "No message provided"}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">
                      {getCustomerName(complaint)}
                    </p>
                    <p className="mt-1 truncate text-xs font-bold text-slate-500">
                      {getOrderNumber(complaint)}
                    </p>
                  </div>

                  <div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${statusClass(status)}`}>
                      <StatusIcon size={14} />
                      {status}
                    </span>
                  </div>

                  <ChevronRight className="hidden text-slate-300 lg:block" size={20} />
                </button>
              );
            })}
          </div>
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

      {clearAllMutation.isError && (
        <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
          {getErrorMessage(clearAllMutation.error)}
        </div>
      )}

      {selectedComplaint && (
        <ComplaintModal
          complaint={selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          onAction={runAction}
          onDelete={(complaint) => deleteMutation.mutate(complaint)}
          actionLoading={actionMutation.isPending}
          deleteLoading={deleteMutation.isPending}
        />
      )}
    </section>
  );
}