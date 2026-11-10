import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardList,
  LoaderCircle,
  Minus,
  Plus,
  Search,
  ShoppingBasket,
  Trash2,
  X
} from "lucide-react";

import { api, currency, getErrorMessage } from "../lib/api";
import { useCartStore } from "../store/cartStore";

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

function getProducts(data) {
  const products =
    data?.suggestions?.products ||
    data?.products ||
    data?.items ||
    [];

  return Array.isArray(products) ? products : [];
}

function productImage(product) {
  return product.images?.[0] || product.image || product.imageUrl || "";
}

function parseLine(line) {
  let name = line.trim();
  let quantity = 1;

  const leading = name.match(/^(\d+)\s*(?:x|\*)?\s+(.+)$/i);
  const trailing = name.match(/^(.+?)\s*(?:x|\*)\s*(\d+)$/i);

  if (leading) {
    quantity = Number(leading[1]);
    name = leading[2].trim();
  } else if (trailing) {
    name = trailing[1].trim();
    quantity = Number(trailing[2]);
  }

  return makeItem({ name, quantity: Math.max(1, quantity) });
}

export default function ShoppingListPage() {
  const [items, setItems] = useState(readSavedList);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pastedList, setPastedList] = useState("");
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [copied, setCopied] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const searchTimer = useRef(null);
  const requestId = useRef(0);

  const addToCart = useCartStore((state) => state.add);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    return () => window.clearTimeout(searchTimer.current);
  }, []);

  const matchedItems = useMemo(
    () => items.filter((item) => item.productId && Number(item.price) > 0),
    [items]
  );

  const estimate = useMemo(
    () =>
      matchedItems.reduce(
        (sum, item) => sum + Number(item.price) * Number(item.quantity || 1),
        0
      ),
    [matchedItems]
  );

  function updateItem(id, patch) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function scheduleSearch(value) {
    setQuery(value);
    setSearchOpen(true);
    setMatches([]);
    window.clearTimeout(searchTimer.current);

    if (value.trim().length < 2) {
      setSearching(false);
      return;
    }

    setSearching(true);
    const currentRequest = ++requestId.current;

    searchTimer.current = window.setTimeout(async () => {
      try {
        const { data } = await api.get("/products/suggestions", {
          params: { q: value.trim() }
        });

        if (currentRequest === requestId.current) {
          setMatches(getProducts(data));
        }
      } catch {
        if (currentRequest === requestId.current) setMatches([]);
      } finally {
        if (currentRequest === requestId.current) setSearching(false);
      }
    }, 300);
  }

  function addProduct(product) {
    const productId = product._id || product.id;
    const existing = items.find((item) => item.productId === productId);

    if (existing) {
      updateItem(existing.id, {
        quantity: Number(existing.quantity || 1) + 1
      });
    } else {
      setItems((current) => [
        ...current,
        makeItem({
          name: product.name || "",
          productId,
          image: productImage(product),
          price: Number(product.price || 0),
          unit: product.unit || ""
        })
      ]);
    }

    setQuery("");
    setMatches([]);
    setSearchOpen(false);
    setCartMessage("");
  }

  function addCustomItem(event) {
    event.preventDefault();
    const name = customName.trim();
    if (!name) return;

    setItems((current) => [...current, makeItem({ name })]);
    setCustomName("");
    setShowCustomForm(false);
    setCartMessage("");
  }

  function importPastedList() {
    const imported = pastedList
      .split(/\n|,/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(parseLine);

    if (!imported.length) return;

    setItems((current) => [...current, ...imported]);
    setPastedList("");
    setShowPaste(false);
  }

  function changeQuantity(item, amount) {
    updateItem(item.id, {
      quantity: Math.max(1, Number(item.quantity || 1) + amount)
    });
  }

  function removeItem(id) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  async function copyList() {
    const text = items
      .filter((item) => item.name.trim())
      .map((item) => {
        const note = item.note?.trim() ? ` (${item.note.trim()})` : "";
        return `${item.quantity} x ${item.name}${note}`;
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
    setCartMessage("");
  }

  async function addMatchedItemsToCart() {
    if (!matchedItems.length) return;

    setAddingToCart(true);
    setCartMessage("");

    try {
      for (const item of matchedItems) {
        await addToCart(
          {
            _id: item.productId,
            name: item.name,
            image: item.image,
            images: item.image ? [item.image] : [],
            price: Number(item.price),
            unit: item.unit,
            status: "active",
            active: true,
            isAvailable: true
          },
          Number(item.quantity)
        );
      }

      setCartMessage(
        `${matchedItems.length} ${
          matchedItems.length === 1 ? "item was" : "items were"
        } added to your cart.`
      );
    } catch (error) {
      setCartMessage(getErrorMessage(error, "Could not add items to cart."));
    } finally {
      setAddingToCart(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f9f6] px-3 pb-36 pt-5 sm:px-5 sm:pb-10 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-lora-green"
        >
          <ArrowLeft size={17} />
          Home
        </Link>

        <header className="mt-4 rounded-[24px] bg-lora-dark p-5 text-white shadow-soft-card sm:p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-lora-lime">
              <ClipboardList size={23} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-lora-lime">
                Lo’ra shopping list
              </p>
              <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                Build your grocery list
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
                Search our store and add the products you need. You can also
                paste a list or add a custom request.
              </p>
            </div>
          </div>
        </header>

        <section className="mt-4 rounded-[24px] border border-slate-100 bg-white p-4 shadow-soft-card sm:p-5">
          <label htmlFor="product-search" className="text-sm font-black text-slate-950">
            Find a product
          </label>

          <div className="relative mt-2">
            {searchOpen && (searching || matches.length > 0) && (
              <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-30 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.16)]">
                {searching && (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-slate-500">
                    <LoaderCircle size={16} className="animate-spin text-lora-green" />
                    Searching products...
                  </div>
                )}

                {!searching &&
                  matches.map((product) => (
                    <button
                      key={product._id || product.id}
                      type="button"
                      onClick={() => addProduct(product)}
                      className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-0 hover:bg-emerald-50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-slate-900">
                          {product.name}
                        </span>
                        <span className="mt-0.5 block text-xs font-bold text-slate-500">
                          {product.unit || "Store product"}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-black text-lora-dark">
                        {currency(product.price)}
                      </span>
                      <Plus size={17} className="shrink-0 text-lora-green" />
                    </button>
                  ))}

                {!searching && matches.length === 0 && query.trim().length >= 2 && (
                  <p className="px-4 py-3 text-sm font-medium text-slate-500">
                    No matching store products. Add it as a custom request below.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-lora-green focus-within:bg-white">
              {searching ? (
                <LoaderCircle size={18} className="animate-spin text-lora-green" />
              ) : (
                <Search size={18} className="text-slate-400" />
              )}
              <input
                id="product-search"
                value={query}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => scheduleSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setSearchOpen(false);
                  if (event.key === "Enter") event.preventDefault();
                }}
                placeholder="Start typing, e.g. Plantain"
                autoComplete="off"
                className="h-12 min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setMatches([]);
                    setSearchOpen(false);
                  }}
                  aria-label="Clear search"
                  className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowPaste((value) => !value)}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-slate-100 px-4 text-xs font-black text-slate-700 transition hover:bg-slate-200"
            >
              <ClipboardList size={15} />
              Paste a list
              <ChevronDown
                size={14}
                className={`transition-transform ${showPaste ? "rotate-180" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={() => setShowCustomForm((value) => !value)}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-emerald-50 px-4 text-xs font-black text-lora-green transition hover:bg-emerald-100"
            >
              <Plus size={15} />
              Add custom request
            </button>
          </div>

          {showPaste && (
            <div className="mt-3 rounded-2xl bg-slate-50 p-3">
              <p className="text-xs leading-5 text-slate-500">
                One item per line or comma-separated. Quantities like “2 milk”
                and “milk x2” are recognized.
              </p>
              <textarea
                value={pastedList}
                onChange={(event) => setPastedList(event.target.value)}
                rows={4}
                placeholder={"2 milk\nBread\n6 eggs"}
                className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-lora-green"
              />
              <button
                type="button"
                onClick={importPastedList}
                disabled={!pastedList.trim()}
                className="mt-2 h-9 rounded-full bg-lora-green px-4 text-xs font-black text-white disabled:bg-slate-300"
              >
                Add pasted items
              </button>
            </div>
          )}

          {showCustomForm && (
            <form onSubmit={addCustomItem} className="mt-3 flex gap-2">
              <input
                value={customName}
                onChange={(event) => setCustomName(event.target.value)}
                placeholder="Custom item name"
                className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-lora-green"
              />
              <button
                type="submit"
                disabled={!customName.trim()}
                className="h-10 rounded-xl bg-lora-green px-4 text-sm font-black text-white disabled:bg-slate-300"
              >
                Add
              </button>
            </form>
          )}
        </section>

        <section className="mt-4 rounded-[24px] border border-slate-100 bg-white p-4 shadow-soft-card sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Your list</h2>
              <p className="mt-1 text-sm text-slate-500">
                {items.length} {items.length === 1 ? "item" : "items"} ·{" "}
                {matchedItems.length} matched to store
              </p>
            </div>

            {items.length > 0 && (
              <button
                type="button"
                onClick={clearList}
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-black text-rose-600 hover:bg-rose-50"
              >
                <Trash2 size={14} />
                Clear list
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-9 text-center">
              <ShoppingBasket size={34} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-black text-slate-900">
                Your list is ready for items
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Search above, paste your list, or add a custom request.
              </p>
            </div>
          ) : (
            <div className="mt-3 divide-y divide-slate-100">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="flex items-center gap-3 py-3 first:pt-1 last:pb-1"
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-xl bg-slate-50 object-contain p-1"
                    />
                  ) : (
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-300">
                      <ShoppingBasket size={20} />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-900">
                      {item.name || "Unnamed item"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {item.productId
                        ? `${item.unit || "Store product"} · ${currency(item.price)}`
                        : "Custom request · price not included"}
                    </p>
                    {item.note && (
                      <p className="mt-1 truncate text-xs text-slate-400">
                        Note: {item.note}
                      </p>
                    )}
                    <input
                      value={item.note || ""}
                      onChange={(event) =>
                        updateItem(item.id, { note: event.target.value })
                      }
                      placeholder="Add a note (optional)"
                      aria-label={`Note for ${item.name}`}
                      className="mt-1 w-full bg-transparent text-xs text-slate-500 outline-none placeholder:text-slate-300"
                    />
                  </div>

                  <div className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-slate-50 px-1">
                    <button
                      type="button"
                      onClick={() => updateItem(item.id, {
                        quantity: Math.max(1, Number(item.quantity || 1) - 1)
                      })}
                      aria-label="Decrease quantity"
                      className="grid h-7 w-7 place-items-center rounded-full text-slate-500 hover:bg-white"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="min-w-4 text-center text-xs font-black text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateItem(item.id, {
                        quantity: Number(item.quantity || 1) + 1
                      })}
                      aria-label="Increase quantity"
                      className="grid h-7 w-7 place-items-center rounded-full text-lora-green hover:bg-white"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {item.productId && (
                    <span className="hidden w-20 text-right text-sm font-black text-lora-dark sm:block">
                      {currency(Number(item.price) * Number(item.quantity))}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <X size={16} />
                  </button>
                </article>
              ))}
            </div>
          )}

          <div className="mt-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={copyList}
              disabled={!items.length}
              className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              {copied ? <Check size={15} /> : <ClipboardList size={15} />}
              {copied ? "Copied" : "Copy list"}
            </button>
          </div>
        </section>

        {cartMessage && (
          <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-lora-green">
            {cartMessage}
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              Matched items estimate
            </p>
            <p className="text-lg font-black text-slate-950">{currency(estimate)}</p>
          </div>
          <button
            type="button"
            onClick={addMatchedItemsToCart}
            disabled={addingToCart || matchedItems.length === 0}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-lora-green px-4 text-xs font-black text-white disabled:bg-slate-300"
          >
            {addingToCart ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <ShoppingBasket size={16} />
            )}
            Add to cart
          </button>
        </div>
      </div>

      <div className="mx-auto hidden max-w-4xl px-3 sm:block sm:px-5 lg:px-8">
        <div className="mt-4 flex items-center justify-between rounded-[22px] bg-white p-4 shadow-soft-card">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Matched items estimate
            </p>
            <p className="mt-1 text-xl font-black text-slate-950">
              {currency(estimate)}
            </p>
          </div>
          <button
            type="button"
            onClick={addMatchedItemsToCart}
            disabled={addingToCart || matchedItems.length === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-lora-green px-5 text-sm font-black text-white disabled:bg-slate-300"
          >
            {addingToCart ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <ShoppingBasket size={17} />
            )}
            Add matched items to cart
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </main>
  );
}