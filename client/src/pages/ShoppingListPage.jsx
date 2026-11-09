import { useEffect, useMemo, useRef, useState } from "react";
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

  return makeItem({ name, quantity: Math.max(1, quantity) });
}

export default function ShoppingListPage() {
  const [items, setItems] = useState(readSavedList);
  const [pastedList, setPastedList] = useState("");
  const [suggestions, setSuggestions] = useState({});
  const [loadingRows, setLoadingRows] = useState({});
  const [openRow, setOpenRow] = useState("");
  const [copied, setCopied] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const searchTimers = useRef({});

  const addToCart = useCartStore((state) => state.add);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    return () => {
      Object.values(searchTimers.current).forEach(window.clearTimeout);
    };
  }, []);

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

  function updateItem(id, patch) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function addBlankItem() {
    const item = makeItem();
    setItems((current) => [...current, item]);
    setOpenRow(item.id);
  }

  function removeItem(id) {
    window.clearTimeout(searchTimers.current[id]);
    setItems((current) => current.filter((item) => item.id !== id));

    setSuggestions((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });

    setLoadingRows((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });

    if (openRow === id) setOpenRow("");
  }

  async function searchSuggestions(rowId, query) {
    if (query.trim().length < 2) {
      setSuggestions((current) => ({ ...current, [rowId]: [] }));
      setLoadingRows((current) => ({ ...current, [rowId]: false }));
      return;
    }

    setLoadingRows((current) => ({ ...current, [rowId]: true }));

    try {
      const { data } = await api.get("/products/suggestions", {
        params: { q: query.trim() }
      });

      const products = getProductList(data);
      const currentItem = items.find((item) => item.id === rowId);

      // Ignore a response if the customer has already changed this field.
      if (currentItem && currentItem.name.trim() === query.trim()) {
        setSuggestions((current) => ({ ...current, [rowId]: products }));
      }
    } catch {
      setSuggestions((current) => ({ ...current, [rowId]: [] }));
    } finally {
      setLoadingRows((current) => ({ ...current, [rowId]: false }));
    }
  }

  function handleNameChange(item, value) {
    updateItem(item.id, {
      name: value,
      productId: "",
      image: "",
      price: null,
      unit: ""
    });

    setOpenRow(item.id);
    setSuggestions((current) => ({ ...current, [item.id]: [] }));
    window.clearTimeout(searchTimers.current[item.id]);

    if (value.trim().length < 2) {
      setLoadingRows((current) => ({ ...current, [item.id]: false }));
      return;
    }

    searchTimers.current[item.id] = window.setTimeout(() => {
      searchSuggestions(item.id, value);
    }, 300);
  }

  function selectSuggestion(rowId, product) {
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
    setOpenRow("");
  }

  function changeQuantity(item, amount) {
    updateItem(item.id, {
      quantity: Math.max(1, Number(item.quantity || 1) + amount)
    });
  }

  function importPastedList() {
    const imported = pastedList
      .split(/\n|,/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(parsePastedLine);

    if (!imported.length) return;

    setItems((current) => [...current, ...imported]);
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
    setOpenRow("");
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
    <main
      className="min-h-screen bg-[#f6f9f6] px-3 pb-24 pt-5 sm:px-5 lg:px-8"
      onClick={() => setOpenRow("")}
    >
      <div className="mx-auto max-w-5xl" onClick={(event) => event.stopPropagation()}>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-lora-green"
        >
          <ArrowLeft size={17} />
          Home
        </Link>

        <header className="mt-4 rounded-[26px] bg-lora-dark p-5 text-white shadow-soft-card sm:p-7">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-lora-lime sm:h-14 sm:w-14">
              <ClipboardList size={25} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-lora-lime">
                Lo’ra shopping list
              </p>
              <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                Drop your list
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
                Paste your list or type an item. Choose a matching Lo’ra product
                to add its size and current price.
              </p>
            </div>
          </div>
        </header>

        <section className="mt-4 rounded-[24px] border border-slate-100 bg-white p-4 shadow-soft-card sm:p-5">
          <label htmlFor="paste-list" className="text-base font-black text-slate-950">
            Paste from WhatsApp
          </label>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            One item per line or separated by commas. Quantities like “2 milk”
            and “milk x2” are recognized.
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
            <span className="text-xs text-slate-400">
              Your list is saved in this browser.
            </span>
            <button
              type="button"
              onClick={importPastedList}
              disabled={!pastedList.trim()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-lora-green px-5 text-sm font-black text-white transition hover:bg-lora-dark disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Plus size={16} />
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
              <h3 className="mt-3 font-black text-slate-950">Your list is empty</h3>
              <p className="mt-1 text-sm text-slate-500">
                Paste a list above or add your first item.
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
                const isOpen = openRow === item.id;
                const isSearching = Boolean(loadingRows[item.id]);

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
                        {item.productId && (
                          <div className="mb-2 flex items-center gap-3 rounded-xl bg-emerald-50 px-3 py-2">
                            <Check size={16} className="shrink-0 text-lora-green" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-black text-lora-dark">
                                Store product selected
                              </p>
                              <p className="text-xs font-bold text-slate-600">
                                {item.unit || "Product"} · {currency(item.price)}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="relative">
                          {isOpen && (isSearching || rowSuggestions.length > 0) && (
                            <div className="absolute bottom-[calc(100%+7px)] left-0 right-0 z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.14)]">
                              {isSearching && (
                                <div className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-slate-500">
                                  <LoaderCircle
                                    size={16}
                                    className="animate-spin text-lora-green"
                                  />
                                  Finding matching products...
                                </div>
                              )}

                              {!isSearching &&
                                rowSuggestions.map((product) => (
                                  <button
                                    key={product._id || product.id}
                                    type="button"
                                    onClick={() => selectSuggestion(item.id, product)}
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
                                    <Plus size={16} className="shrink-0 text-lora-green" />
                                  </button>
                                ))}
                            </div>
                          )}

                          <input
                            value={item.name}
                            onFocus={() => setOpenRow(item.id)}
                            onChange={(event) =>
                              handleNameChange(item, event.target.value)
                            }
                            placeholder="Type an item, e.g. Plantain"
                            aria-label={`List item ${index + 1}`}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm font-bold outline-none transition placeholder:text-slate-400 focus:border-lora-green"
                          />

                          {isSearching && (
                            <LoaderCircle
                              size={16}
                              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-lora-green"
                            />
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
                            placeholder="Optional note: ripe, green, small size..."
                            aria-label={`Note for ${item.name || `item ${index + 1}`}`}
                            className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold outline-none transition placeholder:text-slate-400 focus:border-lora-green"
                          />
                        </div>

                        {item.productId ? (
                          <p className="mt-2 text-xs font-black text-lora-dark">
                            Line estimate:{" "}
                            {currency(Number(item.price) * Number(item.quantity))}
                          </p>
                        ) : item.name.trim() ? (
                          <p className="mt-2 text-xs font-medium text-slate-400">
                            Choose a suggestion to add a real product and price.
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
              Estimate for selected store products
            </p>
            <p className="mt-1 text-2xl font-black text-slate-950">
              {currency(estimate)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Items without a store match are not included.
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
            Browse all products
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