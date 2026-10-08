import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X
} from "lucide-react";

import { api, getErrorMessage } from "../lib/api";

const emptyForm = {
  title: "",
  subtitle: "",
  imageUrl: "",
  mobileImageUrl: "",
  link: "/products",
  sortOrder: 0,
  isActive: true
};

function slideImage(slide) {
  return (
    slide.imageUrl ||
    slide.desktopImage ||
    slide.image ||
    slide.bannerImage ||
    ""
  );
}

function slideMobileImage(slide) {
  return slide.mobileImageUrl || slide.mobileImage || "";
}

function normalizeSlide(slide) {
  return {
    title: slide.title || "",
    subtitle: slide.subtitle || "",
    imageUrl: slideImage(slide),
    mobileImageUrl: slideMobileImage(slide),
    link: slide.link || slide.ctaLink || "/products",
    sortOrder: slide.sortOrder || 0,
    isActive: slide.isActive !== false
  };
}

function UploadBox({ label, value, inputRef, onPick, uploading }) {
  return (
    <div>
      <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </label>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-2 flex min-h-40 w-full items-center justify-center overflow-hidden rounded-[24px] border border-dashed border-slate-200 bg-slate-50 transition hover:border-lora-green hover:bg-emerald-50"
      >
        {value ? (
          <img
            src={value}
            alt={label}
            className="h-full max-h-64 w-full object-contain"
          />
        ) : (
          <div className="text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-lora-green shadow-sm">
              {uploading ? (
                <Loader2 className="animate-spin" size={22} />
              ) : (
                <Upload size={22} />
              )}
            </div>
            <p className="mt-3 text-sm font-black text-slate-700">
              Upload graphic
            </p>
            <p className="mt-1 text-xs font-bold text-slate-400">
              PNG, JPG, WEBP
            </p>
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />
    </div>
  );
}

export default function HeroSlidesManager() {
  const queryClient = useQueryClient();
  const desktopInputRef = useRef(null);
  const mobileInputRef = useRef(null);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [uploadingField, setUploadingField] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-hero-slides"],
    queryFn: async () => {
      const res = await api.get("/hero-slides");
      return res.data;
    }
  });

  const slides = useMemo(() => {
    const list = data?.slides || data || [];

    return [...list].sort((a, b) => {
      return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingId) {
        const res = await api.patch(`/hero-slides/${editingId}`, payload);
        return res.data;
      }

      const res = await api.post("/hero-slides", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] });
      setForm(emptyForm);
      setEditingId("");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/hero-slides/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async (slide) => {
      const res = await api.patch(`/hero-slides/${slide._id}`, {
        isActive: slide.isActive === false
      });

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] });
    }
  });

  async function uploadImage(file, field) {
    if (!file) return;

    setUploadingField(field);

    try {
      const body = new FormData();
      body.append("image", file);

      const res = await api.post("/hero-slides/upload", body, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      const imageUrl =
        res.data?.url ||
        res.data?.imageUrl ||
        res.data?.secure_url ||
        res.data?.image?.url ||
        "";

      if (!imageUrl) {
        throw new Error("Image upload did not return a URL");
      }

      setForm((current) => ({
        ...current,
        [field]: imageUrl
      }));
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setUploadingField("");
    }
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function editSlide(slide) {
    setEditingId(slide._id);
    setForm(normalizeSlide(slide));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId("");
    setForm(emptyForm);
  }

  function submitForm(event) {
    event.preventDefault();

    if (!form.imageUrl) {
      alert("Please upload or paste a hero image URL.");
      return;
    }

    saveMutation.mutate({
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      imageUrl: form.imageUrl,
      mobileImageUrl: form.mobileImageUrl,
      link: form.link || "/products",
      sortOrder: Number(form.sortOrder || 0),
      isActive: Boolean(form.isActive)
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
      <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-soft-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-lora-green">
              Hero graphics
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              {editingId ? "Edit slide" : "Create slide"}
            </h2>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
              Upload the finished flyer from your designer and choose where it
              should open when customers click it.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-500"
              aria-label="Cancel edit"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <form onSubmit={submitForm} className="mt-5 space-y-4">
          <UploadBox
            label="Desktop / main graphic"
            value={form.imageUrl}
            inputRef={desktopInputRef}
            uploading={uploadingField === "imageUrl"}
            onPick={(event) =>
              uploadImage(event.target.files?.[0], "imageUrl")
            }
          />

          <UploadBox
            label="Mobile graphic optional"
            value={form.mobileImageUrl}
            inputRef={mobileInputRef}
            uploading={uploadingField === "mobileImageUrl"}
            onPick={(event) =>
              uploadImage(event.target.files?.[0], "mobileImageUrl")
            }
          />

          <div>
            <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Slide title optional
            </label>
            <input
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Example: Weekly fresh deals"
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-lora-green"
            />
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Short note optional
            </label>
            <input
              value={form.subtitle}
              onChange={(event) => updateField("subtitle", event.target.value)}
              placeholder="Example: Save on selected groceries"
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-lora-green"
            />
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Click link
            </label>
            <input
              value={form.link}
              onChange={(event) => updateField("link", event.target.value)}
              placeholder="/products or /categories/fruits"
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-lora-green"
            />
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Sort order
              </label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(event) =>
                  updateField("sortOrder", event.target.value)
                }
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-lora-green"
              />
            </div>

            <label className="mt-7 flex h-12 items-center gap-2 rounded-2xl bg-slate-50 px-4 text-sm font-black text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  updateField("isActive", event.target.checked)
                }
                className="h-4 w-4 accent-lora-green"
              />
              Active
            </label>
          </div>

          <button
            type="submit"
            disabled={saveMutation.isPending || uploadingField}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-lora-green px-5 text-sm font-black text-white shadow-green-soft transition hover:bg-lora-dark disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saveMutation.isPending ? (
              <Loader2 className="animate-spin" size={18} />
            ) : editingId ? (
              <Save size={18} />
            ) : (
              <Plus size={18} />
            )}
            {editingId ? "Save changes" : "Create hero slide"}
          </button>

          {saveMutation.isError && (
            <p className="rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-600">
              {getErrorMessage(saveMutation.error)}
            </p>
          )}
        </form>
      </section>

      <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-soft-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-lora-green">
              Live slides
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              Homepage hero banners
            </h2>
          </div>

          <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-lora-green">
            {slides.length} slides
          </span>
        </div>

        {isLoading ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-56 animate-pulse rounded-[24px] bg-slate-100"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="mt-5 rounded-[24px] bg-rose-50 p-5 text-sm font-bold text-rose-600">
            {getErrorMessage(error)}
          </div>
        ) : slides.length === 0 ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <ImagePlus className="mx-auto text-slate-300" size={42} />
            <h3 className="mt-3 font-black text-slate-950">
              No hero slides yet
            </h3>
            <p className="mt-1 text-sm font-bold text-slate-500">
              Upload your first homepage graphic to start the slider.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {slides.map((slide) => {
              const image = slideImage(slide);

              return (
                <article
                  key={slide._id}
                  className="overflow-hidden rounded-[24px] border border-slate-100 bg-slate-50"
                >
                  <div className="aspect-[16/7] bg-white">
                    {image ? (
                      <img
                        src={image}
                        alt={slide.title || "Hero slide"}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-slate-300">
                        <ImagePlus size={40} />
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black text-slate-950">
                          {slide.title || "Untitled slide"}
                        </h3>
                        <p className="mt-1 truncate text-xs font-bold text-slate-500">
                          Opens: {slide.link || "/products"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-black ${
                          slide.isActive === false
                            ? "bg-slate-200 text-slate-600"
                            : "bg-emerald-50 text-lora-green"
                        }`}
                      >
                        {slide.isActive === false ? "Hidden" : "Active"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => editSlide(slide)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white text-xs font-black text-slate-700 shadow-sm"
                      >
                        <Pencil size={15} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleMutation.mutate(slide)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white text-xs font-black text-slate-700 shadow-sm"
                      >
                        {slide.isActive === false ? (
                          <Eye size={15} />
                        ) : (
                          <EyeOff size={15} />
                        )}
                        {slide.isActive === false ? "Show" : "Hide"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Delete this hero slide?")) {
                            deleteMutation.mutate(slide._id);
                          }
                        }}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-rose-50 text-xs font-black text-rose-600"
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}