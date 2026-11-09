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

function getProductList(response) {
  const products =
    response?.suggestions?.products ||
    response?.products ||
    response?.items ||
    [];

  return Array.isArray(products) ? products : [];
}

function getProductImage(product) {
  return product.images?.[0] || product.image || product.imageUrl || "";
}

function parsePastedLine(line) {
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

  return makeItem({
    name,
    quantity: Math.max(1, quantity)
  });
}

export default function ShoppingListPage() {
  const [items, setItems] = useState(readSavedList);
  const [suggestions, setSuggestions] = useState({});
  const [loadingRow, setLoadingRow] = useState("");
  const [copied, setCopied] = useState(false);
  const [pastedList, setPastedList] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState("");

  const addToCart = useCartStore((state) => state.add);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const matchedItems = useMemo(
    () =>
      items.filter(
        (item) => item.productId && Number(item.price) > 0 && item.name.trim()
      ),
    [items]
  );

  const estimate = useMemo(
    () =>
      matchedItems.reduce(
        (total, item) =>
          total + Number(item.price) * Number(item.quantity || 1),
        0
      ),
    [matchedItems]
  );

  useEffect(() => {
    const pending = items
      .filter(
        (item) =>
          item.name.trim().length >= 2 &&
          !item.productId &&
          !suggestions[item.id]
      )
      .map((item) => item.id);

    if (!pending.length) return undefined;

    const timer = window.setTimeout(() => {
      pending.forEach((id) => {
        const item = items.find((entry) => entry.id === id);
        if (item) searchSuggestions(id, item.name);
      });
    }, 350);

    return () => window.clearTimeout(timer);
    // Suggestions are fetched from the current item names.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

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
    updateItem(rowId, {
      name: product.name || "",
      productId: product._id || product.id || "",
      image: getProductImage(product),
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
      setLoadingRow((current) => (current === rowId ? "" : current));
    }
  }

  function changeQuantity(item, amount) {
    updateItem(item.id, {
      quantity: Math.max(1, Number(item.quantity || 1) + amount)
    });
  }

  function importPastedList() {
    const parsedItems = pastedList
      .split(/\n|,/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(parsePastedLine);

    if (!parsedItems.length) return;

    setItems((current) => [...current, ...parsedItems]);
    setSuggestions({});
    setPastedList("");
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
        `${matchedItems.length} matched ${
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
    <main className="min-h-screen bg-[#f6f9f6] px-3 pb-24 pt-5 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-lora-green"
        >
          <ArrowLeft size={17} />
          Home
        </Link>

        <header className="mt-4 overflow-hidden rounded-[26px] bg-lora-dark text-white shadow-soft-card">
          <div className="flex items-start gap-4 p-5 sm:items-center sm:p-7">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-lora-lime sm:h-14 sm:w-14">
              <ClipboardList size={25} />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-lora-lime">
                Lo’ra shopping list
              </p>
              <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                Drop your list
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
                Paste your list or add items one by one. We’ll help match them
                to products in our store so you can review an estimate.
              </p>
            </div>
          </div>
        </header>

        <section className="mt-5 rounded-[24px] border border-slate-100 bg-white p-4 shadow-soft-card sm:p-5">
          <label
            htmlFor="paste-list"
            className="text-base font-black text-slate-950"
          >
            Paste a list from WhatsApp
          </label>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            Put each item on a new line or separate them with commas. You can
            include quantities like “2 milk” or “milk x2”.
          </p>

          <textarea
            id="paste-list"
            value={pastedList}
            onChange={(event) => setPastedList(event.target.value)}
            rows={4}
            placeholder={"2 milk\nBread\n6 eggs"}
            className="mt-3 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-lora-green focus:bg-white"
          />

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-medium text-slate-400">
              Your list stays saved in this browser.
            </span>
            <button
              type="button"
              onClick={importPastedList}
              disabled={!pastedList.trim()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-lora-green px-5 text-sm font-black text-white transition hover:bg-lora-dark disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Plus size={17} />
              Add pasted items
            </button>
          </div>
        </section>

        <section className="mt-4 rounded-[24px] border border-slate-100 bg-white p-4 shadow-soft-card sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Your items</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {items.length} {items.length === 1 ? "item" : "items"}
                {matchedItems.length > 0 &&
                  ` · ${matchedItems.length} matched to store products`}
              </p>
            </div>

            <Link
              to="/shopping-list/search"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-emerald-50 px-4 text-sm font-black text-lora-green transition hover:bg-emerald-100"
            >
              <Search size={16} />
              Browse store
            </Link>
          </div>

          {items.length === 0 ? (
            <div className="mt-4 rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
              <ShoppingBasket className="mx-auto text-slate-300" size={38} />
              <h3 className="mt-3 font-black text-slate-950">
                Your list is empty
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Paste a list above or start with your first item.
              </p>
              <button
                type="button"
                onClick={addBlankItem}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-black text-lora-green shadow-sm"
              >
                <Plus size={16} />
                Add an item
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {items.map((item, index) => {
                const rowSuggestions = suggestions[item.id] || [];

                return (
                  <article
                    key={item.id}
                    className="rounded-[20px] border border-slate-100 bg-[#fafcfb] p-3 sm:p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-xs font-black text-slate-400">
                        {index + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        {item.productId && item.image && (
                          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-white p-2">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-12 w-12 rounded-xl object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black text-slate-900">
                                {item.name}
                              </p>
                              <p className="text-xs font-bold text-slate-500">
                                {currency(item.price)}
                                {item.unit ? ` / ${item.unit}` : ""}
                              </p>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-lora-green">
                              Matched
                            </span>
                          </div>
                        )}

                        <div className="relative">
                          <input
                            value={item.name}
                            onChange={(event) => {
                              const name = event.target.value;
                              updateItem(item.id, {
                                name,
                                productId: "",
                                image: "",
                                price: null,
                                unit: ""
                              });
                              setSuggestions((current) => ({
                                ...current,
                                [item.id]: undefined
                              }));
                            }}
                            placeholder="Type an item, e.g. tomatoes"
                            aria-label={`List item ${index + 1}`}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm font-bold outline-none transition placeholder:text-slate-400 focus:border-lora-green"
                          />

                          {loadingRow === item.id && (
                            <LoaderCircle
                              size={17}
                              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-lora-green"
                            />
                          )}

                          {rowSuggestions.length > 0 && (
                            <div className="absolute left-0 right-0 top-[calc(100%+5px)] z-20 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
                              {rowSuggestions.map((product) => (
                                <button
                                  key={product._id || product.id}
                                  type="button"
                                  onClick={() => addProductToList(item.id, product)}
                                  className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-emerald-50"
                                >
                                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                    {getProductImage(product) && (
                                      <img
                                        src={getProductImage(product)}
                                        alt=""
                                        className="h-full w-full object-cover"
                                      />
                                    )}
                                  </span>
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

                        <div className="mt-2 grid gap-2 sm:grid-cols-[130px_1fr]">
                          <div className="flex h-10 items-center justify-between rounded-xl border border-slate-200 bg-white px-2">
                            <button
                              type="button"
                              onClick={() => changeQuantity(item, -1)}
                              aria-label="Decrease quantity"
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                            >
                              <Minus size={15} />
                            </button>
                            <span className="text-sm font-black text-slate-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => changeQuantity(item, 1)}
                              aria-label="Increase quantity"
                              className="grid h-8 w-8 place-items-center rounded-lg text-lora-green hover:bg-emerald-50"
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
                            className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold outline-none transition placeholder:text-slate-400 focus:border-lora-green"
                          />
                        </div>

                        {item.productId && Number(item.price) > 0 ? (
                          <p className="mt-2 text-xs font-black text-lora-dark">
                            Line estimate:{" "}
                            {currency(Number(item.price) * Number(item.quantity))}
                          </p>
                        ) : item.name.trim() ? (
                          <p className="mt-2 text-xs font-medium text-slate-400">
                            Custom request · match it to a store product for a price.
                          </p>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.name || "item"}`}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                );
              })}

              <button
                type="button"
                onClick={addBlankItem}
                className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-black text-lora-green transition hover:bg-emerald-50"
              >
                <Plus size={17} />
                Add another item
              </button>
            </div>
          )}
        </section>

        <section className="mt-4 rounded-[24px] border border-slate-100 bg-white p-4 shadow-soft-card sm:flex sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.13em] text-slate-400">
              Estimate for matched products
            </p>
            <p className="mt-1 text-2xl font-black text-slate-950">
              {currency(estimate)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Custom requests are excluded until matched with a store product.
            </p>
          </div>

          <div className="mt-4 flex gap-2 sm:mt-0">
            <button
              type="button"
              onClick={copyList}
              disabled={!items.some((item) => item.name.trim())}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-slate-100 px-4 text-sm font-black text-slate-700 disabled:opacity-50"
            >
              {copied ? <Check size={16} /> : <ClipboardList size={16} />}
              {copied ? "Copied" : "Copy list"}
            </button>
            <button
              type="button"
              onClick={clearList}
              disabled={!items.length}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-rose-50 px-4 text-sm font-black text-rose-600 disabled:opacity-50"
            >
              <Trash2 size={15} />
              Clear
            </button>
          </div>
        </section>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            to="/shopping-list/search"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:border-lora-green hover:text-lora-green"
          >
            <Search size={17} />
            Find store products
          </Link>

          <button
            type="button"
            onClick={addMatchedItemsToCart}
            disabled={addingToCart || matchedItems.length === 0}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-lora-green px-5 text-sm font-black text-white shadow-green-soft transition hover:bg-lora-dark disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {addingToCart ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <ShoppingBasket size={17} />
            )}
            {addingToCart
              ? "Adding items..."
              : `Add ${matchedItems.length || ""} matched ${
                  matchedItems.length === 1 ? "item" : "items"
                } to cart`}
            {!addingToCart && <ArrowRight size={16} />}
          </button>
        </div>

        {cartMessage && (
          <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-lora-green">
            {cartMessage}
          </p>
        )}
      </div>
    </main>
  );
}