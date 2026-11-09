import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  LoaderCircle,
  Minus,
  Plus,
  Search,
  ShoppingBasket,
  Trash2
} from "lucide-react";

import { api, currency } from "../lib/api";

const STORAGE_KEY = "lora-shopping-list";

function readSavedList() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function makeItem(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: "",
    quantity: 1,
    note: "",
    productId: "",
    image: "",
    price: null,
    unit: "",
    ...overrides
  };
}

function getProductList(response) {
  return (
    response?.suggestions?.products ||
    response?.products ||
    response?.items ||
    []
  );
}

export default function ShoppingListPage() {
  const [items, setItems] = useState(readSavedList);
  const [suggestions, setSuggestions] = useState({});
  const [loadingRow, setLoadingRow] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const pricedItems = useMemo(
    () => items.filter((item) => item.productId && Number(item.price) > 0),
    [items]
  );

  const estimate = useMemo(
    () =>
      pricedItems.reduce(
        (total, item) => total + Number(item.price) * Number(item.quantity || 1),
        0
      ),
    [pricedItems]
  );

  function updateItem(id, patch) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function addBlankItem() {
    setItems((current) => [...current, makeItem()]);
  }

  function removeItem(id) {
    setItems((current) => current.filter((item) => item.id !== id));
    setSuggestions((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function addProductToList(rowId, product) {
    const image =
      product.images?.[0] ||
      product.image ||
      product.imageUrl ||
      "";

    updateItem(rowId, {
      name: product.name || "",
      productId: product._id || product.id || "",
      image,
      price: Number(product.price || 0),
      unit: product.unit || ""
    });

    setSuggestions((current) => ({ ...current, [rowId]: [] }));
  }

  async function searchSuggestions(rowId, query) {
    if (query.trim().length < 2) {
      setSuggestions((current) => ({ ...current, [rowId]: [] }));
      return;
    }

    setLoadingRow(rowId);

    try {
      const { data } = await api.get("/products/suggestions", {
        params: { q: query.trim() }
      });
      setSuggestions((current) => ({
        ...current,
        [rowId]: getProductList(data)
      }));
    } catch {
      setSuggestions((current) => ({ ...current, [rowId]: [] }));
    } finally {
      setLoadingRow("");
    }
  }

  function changeQuantity(item, amount) {
    updateItem(item.id, {
      quantity: Math.max(1, Number(item.quantity || 1) + amount)
    });
  }

  async function copyList() {
    const text = items
      .filter((item) => item.name.trim())
      .map((item) => {
        const note = item.note.trim() ? ` (${item.note.trim()})` : "";
        return `${item.quantity} x ${item.name.trim()}${note}`;
      })
      .join("\n");

    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy your list:", text);
    }
  }

  function clearList() {
    if (!items.length || !window.confirm("Clear your entire shopping list?")) {
      return;
    }

    setItems([]);
    setSuggestions({});
  }

  return (
    <main className="min-h-screen bg-[#f7faf6] px-3 pb-24 pt-5 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-lora-green"
        >
          <ArrowLeft size={17} />
          Back to home
        </Link>

        <header className="mt-5 rounded-[28px] bg-lora-dark p-5 text-white shadow-soft-card sm:p-7">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-lora-lime">
              <ClipboardList size={23} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-lora-lime">
                Your grocery list
              </p>
              <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                Drop your list
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/75">
                Add the things you need. Start typing to match items in Lo’ra’s
                store, or add a custom item and note what you prefer.
              </p>
            </div>
          </div>
        </header>

        <section className="mt-5 rounded-[28px] border border-slate-100 bg-white p-4 shadow-soft-card sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-black text-slate-950">List items</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {items.length} {items.length === 1 ? "item" : "items"} added
              </p>
            </div>

            <Link
              to="/shopping-list/search"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-50 px-5 text-sm font-black text-lora-green transition hover:bg-emerald-100"
            >
              <Search size={17} />
              Find store products
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            {items.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                <ShoppingBasket className="mx-auto text-slate-300" size={38} />
                <h3 className="mt-3 font-black text-slate-950">
                  Your list is empty
                </h3>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Add an item below or find products from our store.
                </p>
              </div>
            )}

            {items.map((item, index) => {
              const rowSuggestions = suggestions[item.id] || [];

              return (
                <article
                  key={item.id}
                  className="rounded-[22px] border border-slate-100 bg-slate-50 p-3 sm:p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-xs font-black text-slate-400">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      {item.productId && item.image && (
                        <div className="mb-3 flex items-center gap-3 rounded-2xl bg-white p-2">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-12 w-12 rounded-xl object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-900">
                              {item.name}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              {currency(item.price)} {item.unit ? `/ ${item.unit}` : ""}
                            </p>
                          </div>
                          <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-lora-green">
                            Store item
                          </span>
                        </div>
                      )}

                      <div className="relative">
                        <input
                          value={item.name}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateItem(item.id, {
                              name: value,
                              productId: "",
                              image: "",
                              price: null,
                              unit: ""
                            });
                            searchSuggestions(item.id, value);
                          }}
                          placeholder="Type an item, e.g. tomatoes"
                          aria-label={`Shopping list item ${index + 1}`}
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm font-bold outline-none transition placeholder:text-slate-400 focus:border-lora-green"
                        />

                        {loadingRow === item.id && (
                          <LoaderCircle
                            size={17}
                            className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-lora-green"
                          />
                        )}

                        {rowSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
                            {rowSuggestions.map((product) => (
                              <button
                                key={product._id || product.id}
                                type="button"
                                onClick={() => addProductToList(item.id, product)}
                                className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-emerald-50"
                              >
                                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                  {(product.images?.[0] || product.image) && (
                                    <img
                                      src={product.images?.[0] || product.image}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  )}
                                </div>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-black text-slate-900">
                                    {product.name}
                                  </span>
                                  <span className="mt-0.5 block text-xs font-bold text-slate-500">
                                    {product.unit || "Item"} · {currency(product.price)}
                                  </span>
                                </span>
                                <Plus size={17} className="text-lora-green" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr]">
                        <div className="flex h-11 items-center justify-between gap-4 rounded-2xl bg-white px-3">
                          <button
                            type="button"
                            onClick={() => changeQuantity(item, -1)}
                            className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={15} />
                          </button>
                          <span className="min-w-6 text-center text-sm font-black text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => changeQuantity(item, 1)}
                            className="grid h-8 w-8 place-items-center rounded-full text-lora-green hover:bg-emerald-50"
                            aria-label="Increase quantity"
                          >
                            <Plus size={15} />
                          </button>
                        </div>

                        <input
                          value={item.note}
                          onChange={(event) =>
                            updateItem(item.id, { note: event.target.value })
                          }
                          placeholder="Optional note: ripe, small size..."
                          aria-label={`Note for ${item.name || `item ${index + 1}`}`}
                          className="h-11 min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-bold outline-none transition placeholder:text-slate-400 focus:border-lora-green"
                        />
                      </div>

                      {item.productId && Number(item.price) > 0 ? (
                        <p className="mt-3 text-xs font-black text-lora-dark">
                          Line estimate: {currency(Number(item.price) * Number(item.quantity))}
                        </p>
                      ) : item.name.trim() ? (
                        <p className="mt-3 text-xs font-bold text-slate-400">
                          Custom request · price not included in estimate
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Remove item"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={addBlankItem}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:border-lora-green hover:text-lora-green"
            >
              <Plus size={18} />
              Add an item
            </button>

            <Link
              to="/shopping-list/search"
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-lora-green px-5 text-sm font-black text-white shadow-green-soft transition hover:bg-lora-dark"
            >
              <Search size={18} />
              Search Lo’ra products
            </Link>
          </div>
        </section>

        <section className="mt-4 rounded-[24px] border border-slate-100 bg-white p-5 shadow-soft-card sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Estimate for matched store items
            </p>
            <p className="mt-1 text-2xl font-black text-slate-950">
              {currency(estimate)}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              Custom requests are excluded until matched to a store product.
            </p>
          </div>

          <div className="mt-4 flex gap-2 sm:mt-0">
            <button
              type="button"
              onClick={copyList}
              disabled={!items.some((item) => item.name.trim())}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-100 px-4 text-sm font-black text-slate-700 disabled:opacity-50"
            >
              {copied ? <Check size={16} /> : <ClipboardList size={16} />}
              {copied ? "Copied" : "Copy list"}
            </button>

            <button
              type="button"
              onClick={clearList}
              disabled={!items.length}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-rose-50 px-4 text-sm font-black text-rose-600 disabled:opacity-50"
            >
              <Trash2 size={16} />
              Clear
            </button>
          </div>
        </section>

        <Link
          to="/shopping-list/search"
          className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full bg-lora-dark px-5 text-sm font-black text-white transition hover:bg-lora-green"
        >
          Add products from the store
          <ArrowRight size={17} />
        </Link>
      </div>
    </main>
  );
}