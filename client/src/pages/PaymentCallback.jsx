import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  Loader2,
  ReceiptText,
  ShieldCheck,
  XCircle
} from "lucide-react";
import { api } from "../lib/api";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("Verifying your Paystack payment...");
  const [orderId, setOrderId] = useState("");

  const reference = useMemo(() => {
    return searchParams.get("reference") || searchParams.get("trxref") || "";
  }, [searchParams]);

  useEffect(() => {
    async function verifyPayment() {
      if (!reference) {
        setStatus("failed");
        setMessage("Payment reference was not found.");
        return;
      }

      try {
        const { data } = await api.get(`/payments/paystack/verify/${reference}`);

        const nextOrderId =
          data.order?._id ||
          data.payment?.order?._id ||
          data.payment?.order ||
          "";

        setOrderId(nextOrderId);

        if (!data.paid) {
          setStatus("failed");
          setMessage("Payment was not successful.");
          return;
        }

        setStatus("success");
        setMessage("Payment confirmed. Your delivery can now begin.");

        if (nextOrderId) {
          window.setTimeout(() => {
            navigate(`/tracking/${nextOrderId}`);
          }, 1200);
        }
      } catch (err) {
        setStatus("failed");
        setMessage(
          err.response?.data?.message ||
            "Payment could not be verified. Please contact support if you were charged."
        );
      }
    }

    verifyPayment();
  }, [navigate, reference]);

  const success = status === "success";
  const failed = status === "failed";

  return (
    <main className="mx-auto flex min-h-[75vh] max-w-3xl items-center justify-center px-4 pt-24">
      <section className="w-full rounded-[28px] border border-slate-100 bg-white p-7 text-center shadow-soft-card sm:p-10">
        <div
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
            success
              ? "bg-emerald-50 text-lora-green"
              : failed
                ? "bg-rose-50 text-rose-600"
                : "bg-slate-50 text-lora-green"
          }`}
        >
          {success && <CheckCircle2 size={38} />}
          {failed && <XCircle size={38} />}
          {!success && !failed && <Loader2 size={38} className="animate-spin" />}
        </div>

        <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-lora-green">
          Paystack
        </p>

        <h1 className="mt-2 text-3xl font-black text-slate-950">
          {success
            ? "Payment confirmed"
            : failed
              ? "Payment failed"
              : "Checking payment"}
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
          {message}
        </p>

        {reference && (
          <div className="mx-auto mt-6 max-w-md rounded-2xl bg-slate-50 p-4 text-left">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Reference
            </p>
            <p className="mt-1 break-all text-sm font-black text-slate-950">
              {reference}
            </p>
          </div>
        )}

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {orderId && (
            <Link
              to={`/tracking/${orderId}`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-lora-green px-6 text-sm font-black text-white shadow-green-soft"
            >
              <ReceiptText size={17} />
              Track order
            </Link>
          )}

          <Link
            to="/orders"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-lora-dark px-6 text-sm font-black text-white"
          >
            <ShieldCheck size={17} />
            View orders
          </Link>
        </div>
      </section>
    </main>
  );
}