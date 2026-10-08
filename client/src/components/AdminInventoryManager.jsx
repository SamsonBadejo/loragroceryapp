import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ImagePlus,
  Loader2,
  PackagePlus,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  X
} from "lucide-react";

import { api, currency, getErrorMessage } from "../lib/api";

const emptyForm = {
  name: "",
  description: "",
  category: "",
  subcategory: "",
  price: "",
  unit: "",
  stock: "",
  stockAlertAt: 8,
  deliveryWeight: "",
  discountPercent: "",
  promotionalTag: "",
  images: [],
  isAvailable: true,
  isFeatured: false,
  status: "active"
};

function productImage(product) {
  return product.images?.[0] || product.image || product.imageUrl || "";
}

function normalizeProduct(product) {
  return {
    name: product.name || "",
    description: product.description || "",
    category: product.category?._id || product.category || "",
    subcategory: product.subcategory || "",
    price: product.price || "",
    unit: product.unit || "",
    stock: product.stock ?? product.stockQuantity ?? "",
    stockAlertAt: product.stockAlertAt ?? 8,
    deliveryWeight: product.deliveryWeight || "",
    discountPercent: product.discountPercent || product.discount || "",
    promotionalTag: product.promotionalTag || product.tag || "",
    images: product.images?.length
      ? product.images
      : product.image
        ? [product.image]
        : [],
    isAvailable: product.isAvailable !== false,
    isFeatured: Boolean(product.isFeatured || product.featured),
    status: product.status || "active"
  };
}

function toPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category || undefined,
    subcategory: form.subcategory.trim(),
    price: Number(form.price || 0),
    unit: form.unit.trim(),
    stock: Number(form.stock || 0),
    stockAlertAt: Number(form.stockAlertAt || 0),
    deliveryWeight: form.deliveryWeight ? Number(form.deliveryWeight) : 0,
    discountPercent: form.discountPercent ? Number(form.discountPercent) : 0,
    promotionalTag: form.promotionalTag.trim(),
    images: form.images,
    image: form.images[0] || "",
    isAvailable: Boolean(form.isAvailable),
    isFeatured: Boolean(form.isFeatured),
    status: form.status || "active"
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

function TextInput(props) {
  return (
    <input
      {...props}
      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-lora-green"
    />
  );
}

function ProductStatus({ product }) {
  const stock = product.stock ?? product.stockQuantity ?? 0;
  const available = product.isAvailable !== false && product.status !== "inactive";

  if (!available) {
    return (
      <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-black text-slate-600">
        Unavailable
      </span>
    );
  }

  if (stock <= 0) {
    return (
      <span className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-600">
        Out of stock
      </span>
    );
  }

  if (stock <= (product.stockAlertAt || 8)) {
    return (
      <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700">
        Low stock
      </span>
    );
  }

  return (
    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-lora-green">
      Available
    </span>
  );
}

export default function AdminInventoryManager() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  const {
    data: productData,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await api.get("/products", {
        params: {
          limit: 200
        }
      });

      return res.data;
    }
  });

  const { data: categoryData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/categories");
      return res.data;
    }
  });

  const products = useMemo(() => {
    const list =
      productData?.products ||
      productData?.items ||
      productData?.data ||
      productData ||
      [];

    return Array.isArray(list) ? list : [];
  }, [productData]);

  const categories = useMemo(() => {
    const list =
      categoryData?.categories ||
      categoryData?.items ||
      categoryData?.data ||
      categoryData ||
      [];

    return Array.isArray(list) ? list : [];
  }, [categoryData]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return products;

    return products.filter((product) => {
      return [
        product.name,
        product.description,
        product.unit,
        product.category?.name,
        product.subcategory,
        product.promotionalTag
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [products, search]);

  const stats = useMemo(() => {
    return products.reduce(
      (acc, product) => {
        const stock = product.stock ?? product.stockQuantity ?? 0;
        const available = product.isAvailable !== false;

        acc.total += 1;

        if (available) acc.available += 1;
        if (!available) acc.unavailable += 1;
        if (stock <= 0) acc.outOfStock += 1;
        if (stock > 0 && stock <= (product.stockAlertAt || 8)) {
          acc.lowStock += 1;
        }

        return acc;
      },
      {
        total: 0,
        available: 0,
        unavailable: 0,
        outOfStock: 0,
        lowStock: 0
      }
    );
  }, [products]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingId) {
        const res = await api.patch(`/products/${editingId}`, payload);
        return res.data;
      }

      const res = await api.post("/products", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setForm(emptyForm);
      setEditingId("");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/products/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async (product) => {
      const available = product.isAvailable !== false;

      const res = await api.patch(`/products/${product._id}`, {
        isAvailable: !available,
        status: available ? "inactive" : "active"
      });

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  });

  const restockMutation = useMutation({
    mutationFn: async ({ product, stock }) => {
      const res = await api.patch(`/products/${product._id}`, {
        stock: Number(stock || 0),
        isAvailable: Number(stock || 0) > 0,
        status: Number(stock || 0) > 0 ? "active" : product.status || "active"
      });

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  });

  async function uploadImages(files) {
    const selectedFiles = Array.from(files || []);

    if (!selectedFiles.length) return;

    setUploading(true);

    try {
      const uploaded = [];

      for (const file of selectedFiles) {
        const body = new FormData();
        body.append("image", file);

        const res = await api.post("/products/upload", body, {
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

        if (imageUrl) uploaded.push(imageUrl);
      }

      setForm((current) => ({
        ...current,
        images: [...current.images, ...uploaded]
      }));
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function editProduct(product) {
    setEditingId(product._id);
    setForm(normalizeProduct(product));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId("");
    setForm(emptyForm);
  }

  function removeImage(imageUrl) {
    setForm((current) => ({
      ...current,
      images: current.images.filter((image) => image !== imageUrl)
    }));
  }

  function submitForm(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Product name is required.");
      return;
    }

    if (!Number(form.price)) {
      alert("Product price is required.");
      return;
    }

    if (!form.unit.trim()) {
      alert("Product unit is required.");
      return;
    }

    saveMutation.mutate(toPayload(form));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
      <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-soft-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-lora-green">
              Inventory
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              {editingId ? "Edit product" : "Add product"}
            </h2>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
              Add products, upload images, set stock, pricing, availability and
              promotional tags.
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
          <Field label="Product images">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-32 w-full items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 transition hover:border-lora-green hover:bg-emerald-50"
            >
              <div className="text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-lora-green shadow-sm">
                  {uploading ? (
                    <Loader2 className="animate-spin" size={22} />
                  ) : (
                    <Upload size={22} />
                  )}
                </div>
                <p className="mt-3 text-sm font-black text-slate-700">
                  Upload product images
                </p>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => uploadImages(event.target.files)}
            />

            {form.images.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {form.images.map((image) => (
                  <div
                    key={image}
                    className="group relative aspect-square overflow-hidden rounded-2xl bg-slate-100"
                  >
                    <img
                      src={image}
                      alt="Product"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(image)}
                      className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-white text-rose-600 shadow-sm"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>

          <Field label="Product name">
            <TextInput
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Fresh apples"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="Short product description"
              rows={3}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-lora-green"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category">
              <select
                value={form.category}
                onChange={(event) => updateField("category", event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-lora-green"
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category._id || category.id} value={category._id || category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Subcategory">
              <TextInput
                value={form.subcategory}
                onChange={(event) =>
                  updateField("subcategory", event.target.value)
                }
                placeholder="Organic"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Price">
              <TextInput
                type="number"
                min="0"
                value={form.price}
                onChange={(event) => updateField("price", event.target.value)}
                placeholder="2500"
              />
            </Field>

            <Field label="Unit">
              <TextInput
                value={form.unit}
                onChange={(event) => updateField("unit", event.target.value)}
                placeholder="1kg / 500ml / pack"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Stock quantity">
              <TextInput
                type="number"
                min="0"
                value={form.stock}
                onChange={(event) => updateField("stock", event.target.value)}
                placeholder="30"
              />
            </Field>

            <Field label="Stock alert at">
              <TextInput
                type="number"
                min="0"
                value={form.stockAlertAt}
                onChange={(event) =>
                  updateField("stockAlertAt", event.target.value)
                }
                placeholder="8"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Delivery weight">
              <TextInput
                type="number"
                min="0"
                value={form.deliveryWeight}
                onChange={(event) =>
                  updateField("deliveryWeight", event.target.value)
                }
                placeholder="1"
              />
            </Field>

            <Field label="Discount %">
              <TextInput
                type="number"
                min="0"
                max="100"
                value={form.discountPercent}
                onChange={(event) =>
                  updateField("discountPercent", event.target.value)
                }
                placeholder="10"
              />
            </Field>
          </div>

          <Field label="Promotional tag">
            <TextInput
              value={form.promotionalTag}
              onChange={(event) =>
                updateField("promotionalTag", event.target.value)
              }
              placeholder="New arrival / Best seller"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex h-12 items-center gap-2 rounded-2xl bg-slate-50 px-4 text-sm font-black text-slate-700">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(event) =>
                  updateField("isAvailable", event.target.checked)
                }
                className="h-4 w-4 accent-lora-green"
              />
              Available
            </label>

            <label className="flex h-12 items-center gap-2 rounded-2xl bg-slate-50 px-4 text-sm font-black text-slate-700">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(event) =>
                  updateField("isFeatured", event.target.checked)
                }
                className="h-4 w-4 accent-lora-green"
              />
              Featured
            </label>
          </div>

          <button
            type="submit"
            disabled={saveMutation.isPending || uploading}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-lora-green px-5 text-sm font-black text-white shadow-green-soft transition hover:bg-lora-dark disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saveMutation.isPending ? (
              <Loader2 className="animate-spin" size={18} />
            ) : editingId ? (
              <Save size={18} />
            ) : (
              <PackagePlus size={18} />
            )}
            {editingId ? "Save product" : "Add product"}
          </button>

          {saveMutation.isError && (
            <p className="rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-600">
              {getErrorMessage(saveMutation.error)}
            </p>
          )}
        </form>
      </section>

      <section className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[22px] bg-white p-4 shadow-soft-card">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Total
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {stats.total}
            </p>
          </div>
          <div className="rounded-[22px] bg-white p-4 shadow-soft-card">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Available
            </p>
            <p className="mt-2 text-2xl font-black text-lora-green">
              {stats.available}
            </p>
          </div>
          <div className="rounded-[22px] bg-white p-4 shadow-soft-card">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Low stock
            </p>
            <p className="mt-2 text-2xl font-black text-amber-600">
              {stats.lowStock}
            </p>
          </div>
          <div className="rounded-[22px] bg-white p-4 shadow-soft-card">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Out
            </p>
            <p className="mt-2 text-2xl font-black text-rose-600">
              {stats.outOfStock}
            </p>
          </div>
          <div className="rounded-[22px] bg-white p-4 shadow-soft-card">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Hidden
            </p>
            <p className="mt-2 text-2xl font-black text-slate-700">
              {stats.unavailable}
            </p>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-soft-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-lora-green">
                Products
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Product inventory
              </h2>
            </div>

            <div className="relative w-full lg:w-80">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products..."
                className="h-12 w-full rounded-full border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-lora-green focus:bg-white"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-72 animate-pulse rounded-[24px] bg-slate-100"
                />
              ))}
            </div>
          ) : isError ? (
            <div className="mt-5 rounded-[24px] bg-rose-50 p-5 text-sm font-bold text-rose-600">
              {getErrorMessage(error)}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <Boxes className="mx-auto text-slate-300" size={42} />
              <h3 className="mt-3 font-black text-slate-950">
                No products found
              </h3>
              <p className="mt-1 text-sm font-bold text-slate-500">
                Add a product or change your search.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => {
                const image = productImage(product);
                const stock = product.stock ?? product.stockQuantity ?? 0;
                const available = product.isAvailable !== false;

                return (
                  <article
                    key={product._id}
                    className="overflow-hidden rounded-[24px] border border-slate-100 bg-slate-50"
                  >
                    <div className="relative aspect-[4/3] bg-white">
                      {image ? (
                        <img
                          src={image}
                          alt={product.name}
                          className="h-full w-full object-contain p-4"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-slate-300">
                          <ImagePlus size={42} />
                        </div>
                      )}

                      <div className="absolute left-3 top-3">
                        <ProductStatus product={product} />
                      </div>

                      {product.isFeatured && (
                        <span className="absolute right-3 top-3 rounded-full bg-lora-dark px-3 py-1 text-[11px] font-black text-white">
                          Featured
                        </span>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="line-clamp-2 min-h-10 text-sm font-black text-slate-950">
                        {product.name}
                      </h3>

                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-lg font-black text-lora-dark">
                            {currency(product.price)}
                          </p>
                          <p className="text-xs font-bold text-slate-400">
                            / {product.unit || "unit"}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-black text-slate-950">
                            {stock}
                          </p>
                          <p className="text-xs font-bold text-slate-400">
                            in stock
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => editProduct(product)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white text-xs font-black text-slate-700 shadow-sm"
                        >
                          <Pencil size={15} />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleMutation.mutate(product)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white text-xs font-black text-slate-700 shadow-sm"
                        >
                          {available ? (
                            <ToggleRight size={17} />
                          ) : (
                            <ToggleLeft size={17} />
                          )}
                          {available ? "Hide" : "Show"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const nextStock = prompt(
                              `Enter new stock for ${product.name}`,
                              String(stock)
                            );

                            if (nextStock !== null) {
                              restockMutation.mutate({
                                product,
                                stock: nextStock
                              });
                            }
                          }}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-emerald-50 text-xs font-black text-lora-green"
                        >
                          <RefreshCcw size={15} />
                          Restock
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete ${product.name}?`)) {
                              deleteMutation.mutate(product._id);
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
        </div>

        {(deleteMutation.isError ||
          toggleMutation.isError ||
          restockMutation.isError) && (
          <div className="rounded-[24px] bg-rose-50 p-4 text-sm font-bold text-rose-600">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} />
              {getErrorMessage(
                deleteMutation.error ||
                  toggleMutation.error ||
                  restockMutation.error
              )}
            </div>
          </div>
        )}

        {(saveMutation.isSuccess ||
          deleteMutation.isSuccess ||
          toggleMutation.isSuccess ||
          restockMutation.isSuccess) && (
          <div className="rounded-[24px] bg-emerald-50 p-4 text-sm font-bold text-lora-green">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} />
              Inventory updated.
            </div>
          </div>
        )}
      </section>
    </div>
  );
}