import { Coupon } from "../models/Coupon.js";

export async function calculateCartTotals(cart) {
  const subtotal = cart.items.reduce((sum, item) => {
    const price = item.product?.price || item.priceAtAdd || 0;
    return sum + price * item.quantity;
  }, 0);

  const tax = Math.round(subtotal * 0.075);
  let deliveryFee = subtotal >= 30000 ? 0 : 1800;
  let discount = 0;

  if (cart.couponCode) {
    const coupon = await Coupon.findOne({
      code: cart.couponCode,
      active: true
    });

    const isExpired = coupon?.expiresAt && coupon.expiresAt < new Date();

    if (coupon && !isExpired && subtotal >= coupon.minSubtotal) {
      if (coupon.type === "percentage") {
        discount = Math.round(subtotal * (coupon.value / 100));
      }

      if (coupon.type === "fixed") {
        discount = coupon.value;
      }

      if (coupon.type === "free_delivery") {
        deliveryFee = 0;
      }
    }
  }

  const total = Math.max(0, subtotal + tax + deliveryFee - discount);

  return {
    subtotal,
    tax,
    deliveryFee,
    discount,
    total
  };
}