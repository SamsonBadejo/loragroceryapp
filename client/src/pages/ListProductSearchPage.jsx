import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Search,
  ShoppingBasket,
  Plus,
  LoaderCircle
} from "lucide-react";

import { api, currency, getErrorMessage } from "../lib/api";

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

function getProducts(response) {
  const products =
    response?.products ||
    response?.items ||
    response?.data ||
    response ||
    [];

  return Array.isArray(products) ? products : [];
}

function getImage(product) {
  return (
    product.images?.[0] ||
    product.image ||
    product.imageUrl ||
    ""
  );
}

function available(product) {
  const stock = product.stock ?? product.stockQuantity ?? 0;
  return product.isAvailable !== false && product.status !== "inactive" && stock > 0;
}

export default function ListProductSearchPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [addedIds, setAddedIds] = useState([]);

  const query = search.trim();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["shopping-list-product-search", query],
    queryFn: async () => {
      const res = await api.get("/products", {
        params: {
          q: query,
          limit: 60
        }
      });

      return res.data;
    },
    enabled: query.length >= 2,
    retry: 1
  });

  const products = useMemo(() => {
    return getProducts(data).filter(available);
  }, [data]);

  function addToList(product) {
    const current = readSavedList();
    const productId = product._id || product.id;
    const existing = current.find((item) => item.productId === productId);

    if (existing) {
      const updated = current.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Number(item.quantity || 1) + 1 }
          : item
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } else {
      const newItem = {
        id: crypto.randomUUID(),
        name: product.name || "",
        quantity: 1,
        note: "",
        productId,
        image: getImage(product),
        price: Number(product.price || 0),
        unit: product.unit || ""
      };

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([...current, newItem])
      );
    }

    setAddedIds((ids) => [...ids, productId]);
    window.setTimeout(() => {
      setAddedIds((ids) => ids.filter((id) => id !== productId));
    }, 1600);
  }

  function finishAdding() {
    navigate("/shopping-list");
  }

  return (
    <main className="min-h-screen bg-[#f7faf6] px-3 pb-24 pt-5 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/shopping-list"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-lora-green"
        >
          <ArrowLeft size={17} />
          Back to your list
        </Link>

        <header className="mt-5 rounded-[28px] bg-lora-dark p-5 text-white shadow-soft-card sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-lora-lime">
            Lo’ra store
          </p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">
            Find products for your list
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/75">
            Search available store products. Add the exact product, size and
            price to your list, then review everything before checkout.
          </p>
        </header>

        <div className="sticky top-2 z-20 mt-4 rounded-[22px] border border-slate-100 bg-white p-3 shadow-soft-card">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4">
            {isLoading ? (
              <LoaderCircle
                size={19}
                className="animate-spin text-lora-green"
              />
            ) : (
              <Search size={19} className="text-slate-400" />
            )}
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products, e.g. rice or milk"
              autoFocus
              className="h-12 w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-xs font-black text-slate-500"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">
              {query.length >= 2 ? "Matching products" : "Search the store"}
            </h2>
            {query.length >= 2 && !isLoading && (
              <p className="mt-1 text-sm font-bold text-slate-500">
                {products.length} {products.length === 1 ? "match" : "matches"}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={finishAdding}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-emerald-50 px-4 text-sm font-black text-lora-green"
          >
            <ShoppingBasket size={17} />
            View list
          </button>
        </div>

        {query.length < 2 ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-white px-5 py-12 text-center">
            <Search className="mx-auto text-slate-300" size={40} />
            <h3 className="mt-3 font-black text-slate-950">
              What are you looking for?
            </h3>
            <p className="mt-1 text-sm font-bold text-slate-500">
              Type at least two letters to search available products.
            </p>
          </div>
        ) : isLoading ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-[22px] bg-white"
              >
                <div className="aspect-square animate-pulse bg-slate-100" />
                <div className="space-y-2 p-3">
                  <div className="h-4 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="mt-5 rounded-[24px] bg-rose-50 p-5 text-sm font-bold text-rose-600">
            {getErrorMessage(error, "We could not search products. Please try again.")}
          </div>
        ) : products.length === 0 ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-white px-5 py-12 text-center">
            <ShoppingBasket className="mx-auto text-slate-300" size={40} />
            <h3 className="mt-3 font-black text-slate-950">
              No matching products
            </h3>
            <p className="mt-1 text-sm font-bold text-slate-500">
              Try another search, or add it as a custom request from your list.
            </p>
            <Link
              to="/shopping-list"
              className="mt-4 inline-flex h-10 items-center rounded-full bg-lora-green px-5 text-sm font-black text-white"
            >
              Back to list
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {products.map((product) => {
              const id = product._id || product.id;
              const image = getImage(product);
              const added = addedIds.includes(id);

              return (
                <article
                  key={id}
                  className="overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-sm transition hover:shadow-soft-card sm:rounded-[24px]"
                >
                  <div className="relative aspect-square bg-slate-50">
                    {image ? (
                      <img
                        src={image}
                        alt={product.name}
                        loading="lazy"
                        className="h-full w-full object-contain p-3 sm:p-5"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-slate-300">
                        <ShoppingBasket size={36} />
                      </div>
                    )}
                  </div>

                  <div className="p-3 sm:p-4">
                    <h3 className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-slate-950">
                      {product.name}
                    </h3>
                    <p className="mt-1 truncate text-xs font-bold text-slate-500">
                      {product.unit || "Available"}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-black text-lora-dark sm:text-base">
                        {currency(product.price)}
                      </p>
                      <button
                        type="button"
                        onClick={() => addToList(product)}
                        aria-label={`Add ${product.name} to your list`}
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition ${
                          added
                            ? "bg-emerald-100 text-lora-green"
                            : "bg-lora-green text-white hover:bg-lora-dark"
                        }`}
                      >
                        {added ? <Check size={18} /> : <Plus size={19} />}
                      </button>
                    </div>

                    {added && (
                      <p className="mt-2 text-xs font-black text-lora-green">
                        Added to your list
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-6 rounded-[24px] bg-white p-4 shadow-soft-card sm:flex sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-sm font-black text-slate-950">
              Done searching?
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              Review quantities and notes on your list before checkout.
            </p>
          </div>

          <button
            type="button"
            onClick={finishAdding}
            className="mt-4 h-11 w-full rounded-full bg-lora-green px-5 text-sm font-black text-white transition hover:bg-lora-dark sm:mt-0 sm:w-auto"
          >
            Return to my list
          </button>
        </div>
      </div>
    </main>
  );
}