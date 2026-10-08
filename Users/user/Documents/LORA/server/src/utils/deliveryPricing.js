import { DeliveryPricing } from "../models/DeliveryPricing.js";

const defaultPricing = {
  rider: {
    serviceType: "rider",
    label: "Rider",
    customerTiers: [
      { fromKm: 0, toKm: 5, price: 1500 },
      { fromKm: 5, toKm: 10, price: 2500 }
    ],
    perKmPriceAfterLastTier: 350,
    surge: {
      rainMultiplier: 1,
      trafficMultiplier: 1,
      peakHourMultiplier: 1,
      manualSurgeEnabled: false,
      manualSurgeMultiplier: 1
    },
    payout: {
      basePayout: 1000,
      perKmAfterKm: 3,
      perKmAmount: 150,
      localTiers: []
    },
    platform: {
      minimumMargin: 300,
      marginPercent: 20
    }
  },
  deliveryBoy: {
    serviceType: "deliveryBoy",
    label: "Delivery Boy",
    customerTiers: [
      { fromKm: 0, toKm: 3, price: 1200 },
      { fromKm: 3, toKm: 5, price: 1600 },
      { fromKm: 5, toKm: 20, price: 2200 }
    ],
    perKmPriceAfterLastTier: 250,
    surge: {
      rainMultiplier: 1,
      trafficMultiplier: 1,
      peakHourMultiplier: 1,
      manualSurgeEnabled: false,
      manualSurgeMultiplier: 1
    },
    payout: {
      basePayout: 700,
      perKmAfterKm: 3,
      perKmAmount: 100,
      localTiers: [
        { fromKm: 0, toKm: 3, payout: 700 },
        { fromKm: 3, toKm: 5, payout: 900 }
      ]
    },
    platform: {
      minimumMargin: 250,
      marginPercent: 20
    }
  }
};

export function haversineKm(origin, destination) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(destination.lat - origin.lat);
  const dLng = toRadians(destination.lng - origin.lng);

  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((earthRadiusKm * c).toFixed(2));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

export async function ensureDefaultPricing() {
  const docs = await Promise.all(
    Object.values(defaultPricing).map((pricing) =>
      DeliveryPricing.findOneAndUpdate(
        { serviceType: pricing.serviceType },
        { $setOnInsert: pricing },
        { new: true, upsert: true }
      )
    )
  );

  return docs;
}

function calculateCustomerPrice(pricing, distanceKm) {
  const sortedTiers = [...pricing.customerTiers].sort((a, b) => a.fromKm - b.fromKm);
  const matchingTier = sortedTiers.find((tier) => distanceKm > tier.fromKm && distanceKm <= tier.toKm);

  if (matchingTier) {
    return matchingTier.price;
  }

  const lastTier = sortedTiers[sortedTiers.length - 1];

  if (!lastTier) {
    return pricing.perKmPriceAfterLastTier * Math.max(distanceKm, 1);
  }

  const extraKm = Math.max(distanceKm - lastTier.toKm, 0);
  return lastTier.price + extraKm * pricing.perKmPriceAfterLastTier;
}

function calculateWorkerPayout(pricing, serviceType, distanceKm) {
  if (serviceType === "deliveryBoy" && pricing.payout.localTiers?.length) {
    const localTier = pricing.payout.localTiers.find(
      (tier) => distanceKm > tier.fromKm && distanceKm <= tier.toKm
    );

    if (localTier) {
      return localTier.payout;
    }
  }

  const extraKm = Math.max(distanceKm - pricing.payout.perKmAfterKm, 0);
  return pricing.payout.basePayout + extraKm * pricing.payout.perKmAmount;
}

function calculateSurgeMultiplier(pricing, surgeOptions = {}) {
  let multiplier = 1;

  if (surgeOptions.rain) {
    multiplier *= pricing.surge.rainMultiplier || 1;
  }

  if (surgeOptions.traffic) {
    multiplier *= pricing.surge.trafficMultiplier || 1;
  }

  if (surgeOptions.peakHour) {
    multiplier *= pricing.surge.peakHourMultiplier || 1;
  }

  if (pricing.surge.manualSurgeEnabled) {
    multiplier *= pricing.surge.manualSurgeMultiplier || 1;
  }

  return Number(multiplier.toFixed(2));
}

export async function calculateDeliveryQuote({ serviceType = "rider", distanceKm, surgeOptions = {} }) {
  await ensureDefaultPricing();

  const pricing =
    (await DeliveryPricing.findOne({ serviceType, isActive: true }).lean()) || defaultPricing[serviceType];

  const baseCustomerPrice = calculateCustomerPrice(pricing, distanceKm);
  const surgeMultiplier = calculateSurgeMultiplier(pricing, surgeOptions);
  const customerPrice = Math.ceil(baseCustomerPrice * surgeMultiplier);
  const riderPayout = Math.ceil(calculateWorkerPayout(pricing, serviceType, distanceKm));
  const platformMargin = Math.max(customerPrice - riderPayout, 0);

  return {
    serviceType,
    distanceKm,
    customerPrice,
    riderPayout,
    platformMargin,
    surgeMultiplier,
    etaMinutes: serviceType === "deliveryBoy" ? 20 + Math.ceil(distanceKm * 3) : 35 + Math.ceil(distanceKm * 4),
    pricing
  };
}