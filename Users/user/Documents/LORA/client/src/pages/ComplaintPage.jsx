import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Camera, MessageCircleWarning } from "lucide-react";

import { api } from "../lib/api";

export default function ComplaintPage() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    orderId: params.get("order") || "",
    type: "damaged_item",
    description: "",
    evidenceImage: ""
  });

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  async function submit(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    try {
      await api.post("/complaints", {
        orderId: form.orderId,
        type: form.type,
        description: form.description,
        evidenceImages: form.evidenceImage ? [form.evidenceImage] : []
      });

      setMessage(
        "Complaint submitted. Admin can review, refund, warn, or suspend from the dashboard."
      );

      setForm((current) => ({
        ...current,
        type: "damaged_item",
        description: "",
        evidenceImage: ""
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Complaint could not be submitted");
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[34px] bg-white p-6 shadow-card ring-1 ring-lora-dark/5 sm:p-8">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-red-500">
          <MessageCircleWarning size={16} />
          Complaint center
        </p>

        <h1 className="mt-3 text-4xl font-black">Report an order issue</h1>

        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <label>
            <span className="text-sm font-black text-lora-dark/68">
              Order ID
            </span>
            <input
              name="orderId"
              value={form.orderId}
              onChange={updateField}
              className="mt-2 h-14 w-full rounded-2xl bg-lora-mist px-4 font-bold outline-none ring-lora-green focus:ring-2"
            />
          </label>

          <label>
            <span className="text-sm font-black text-lora-dark/68">
              Issue type
            </span>

            <select
              name="type"
              value={form.type}
              onChange={updateField}
              className="mt-2 h-14 w-full rounded-2xl bg-lora-mist px-4 font-bold outline-none ring-lora-green focus:ring-2"
            >
              <option value="rider">Report rider</option>
              <option value="damaged_item">Damaged item</option>
              <option value="late_delivery">Late delivery</option>
              <option value="refund_request">Request refund</option>
              <option value="missing_item">Missing item</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label>
            <span className="text-sm font-black text-lora-dark/68">
              Details
            </span>

            <textarea
              name="description"
              value={form.description}
              onChange={updateField}
              className="mt-2 min-h-36 w-full rounded-2xl bg-lora-mist px-4 py-4 font-bold outline-none ring-lora-green focus:ring-2"
              placeholder="Tell us what happened..."
            />
          </label>

          <label>
            <span className="flex items-center gap-2 text-sm font-black text-lora-dark/68">
              <Camera size={16} />
              Evidence image URL or data URI
            </span>

            <input
              name="evidenceImage"
              value={form.evidenceImage}
              onChange={updateField}
              className="mt-2 h-14 w-full rounded-2xl bg-lora-mist px-4 font-bold outline-none ring-lora-green focus:ring-2"
              placeholder="https://..."
            />
          </label>

          {message && (
            <p className="rounded-2xl bg-lora-mist p-4 text-sm font-bold text-lora-green">
              {message}
            </p>
          )}

          {error && (
            <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
              {error}
            </p>
          )}

          <button className="h-14 rounded-2xl bg-lora-green font-black text-white shadow-glow">
            Submit complaint
          </button>
        </form>
      </div>
    </section>
  );
}