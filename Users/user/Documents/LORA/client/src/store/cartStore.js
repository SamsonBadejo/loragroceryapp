import { create } from "zustand";
import { api } from "../lib/api";

const emptyTotals = {
  subtotal: 0,
  tax: 0,
  deliveryFee: 0,
  discount: 0,
  total: 0,
};

function isProductAvailable(product) {
  if (!product) return false;
  if (product.status && product.status !== "active") return false;
  if (product.active === false) return false;
  if (product.isAvailable === false) return false;

  const stock = product.stock ?? product.stockQuantity ?? product.inventory;

  if (stock !== undefined && Number(stock) <= 0) return false;

  return true;
}

export const useCartStore = create((set, get) => ({
  items: [],
  totals: emptyTotals,
  open: false,
  loading: false,
  error: "",

  setOpen: (open) => {
    set({ open });
  },

  sync: async () => {
    set({ loading: true });

    try {
      const { data } = await api.get("/cart");

      set({
        items: data.cart.items,
        totals: data.totals,
        loading: false,
        error: "",
      });
    } catch {
      set({
        loading: false,
      });
    }
  },

  add: async (product, quantity = 1) => {
    if (!isProductAvailable(product)) {
      set({
        error: "This product is currently unavailable.",
      });

      return;
    }

    set({
      loading: true,
      error: "",
    });

    const existingItems = [...get().items];

    const existing = existingItems.find((item) => {
      return item.product._id === product._id;
    });

    if (existing) {
      existing.quantity += quantity;
    } else {
      existingItems.push({
        product,
        quantity,
        priceAtAdd: product.price,
      });
    }

    set({
      items: existingItems,
      open: true,
    });

    try {
      const { data } = await api.post("/cart/items", {
        productId: product._id,
        quantity,
      });

      set({
        items: data.cart.items,
        totals: data.totals,
        loading: false,
        error: "",
      });
    } catch (err) {
      set({
        loading: false,
        error:
          err.response?.data?.message || "Could not add product to cart.",
      });

      await get().sync();
    }
  },

  update: async (productId, quantity) => {
    try {
      const { data } = await api.patch(`/cart/items/${productId}`, {
        quantity,
      });

      set({
        items: data.cart.items,
        totals: data.totals,
        error: "",
      });
    } catch (err) {
      set({
        error:
          err.response?.data?.message || "Could not update cart item.",
      });
    }
  },

  applyCoupon: async (code) => {
    const { data } = await api.post("/cart/coupon", {
      code,
    });

    set({
      items: data.cart.items,
      totals: data.totals,
      error: "",
    });
  },

  clear: async () => {
    const { data } = await api.delete("/cart");

    set({
      items: data.cart.items,
      totals: data.totals,
      error: "",
    });
  },
}));