import { create } from "zustand";

const STORAGE_KEY = "lora-wishlist";

function loadWishlist() {
  if (typeof localStorage === "undefined") return [];

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveWishlist(products) {
  if (typeof localStorage === "undefined") return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export const useWishlistStore = create((set, get) => ({
  products: loadWishlist(),

  isFavorite: (productId) => {
    return get().products.some((product) => product._id === productId);
  },

  add: (product) => {
    const exists = get().products.some((item) => item._id === product._id);

    if (exists) return;

    const products = [product, ...get().products];

    saveWishlist(products);
    set({ products });
  },

  remove: (productId) => {
    const products = get().products.filter((product) => product._id !== productId);

    saveWishlist(products);
    set({ products });
  },

  toggle: (product) => {
    const exists = get().products.some((item) => item._id === product._id);

    const products = exists
      ? get().products.filter((item) => item._id !== product._id)
      : [product, ...get().products];

    saveWishlist(products);
    set({ products });
  },

  clear: () => {
    saveWishlist([]);
    set({ products: [] });
  }
}));