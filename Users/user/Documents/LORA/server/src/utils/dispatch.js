import { User } from "../models/User.js";

const storeCoordinates = [3.3792, 6.5244];

function serviceRole(serviceType) {
  return serviceType === "deliveryBoy" ? "deliveryBoy" : "rider";
}

function serviceLabel(serviceType) {
  return serviceType === "deliveryBoy" ? "Delivery Boy" : "Rider";
}

export async function findAvailableDeliveryWorkers({
  serviceType = "rider",
  destinationCoordinates,
  limit = 8
}) {
  const query = {
    role: serviceRole(serviceType),
    isSuspended: false,
    "deliveryWorker.isOnline": true,
    "deliveryWorker.availabilityStatus": "available"
  };

  if (Array.isArray(destinationCoordinates)) {
    query["deliveryWorker.currentLocation"] = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: destinationCoordinates
        },
        $maxDistance: serviceType === "deliveryBoy" ? 20000 : 150000
      }
    };
  }

  return User.find(query)
    .limit(limit)
    .select("name email phone role avatar deliveryWorker");
}

export async function autoAssignDeliveryWorker(order) {
  const destinationCoordinates = order.address?.location?.coordinates;

  if (!Array.isArray(destinationCoordinates)) {
    return {
      order,
      worker: null,
      assigned: false
    };
  }

  const workers = await findAvailableDeliveryWorkers({
    serviceType: order.deliveryServiceType,
    destinationCoordinates,
    limit: 1
  });

  const worker = workers[0];

  if (!worker) {
    return {
      order,
      worker: null,
      assigned: false
    };
  }

  const workerCoordinates =
    worker.deliveryWorker?.currentLocation?.coordinates || storeCoordinates;

  order.assignedRider = worker._id;
  order.stage = "Confirmed";
  order.status = "Confirmed";
  order.delivery = {
    ...order.delivery,
    assignedAt: new Date(),
    riderLocation: {
      type: "Point",
      coordinates: workerCoordinates
    },
    route: [storeCoordinates, workerCoordinates, destinationCoordinates]
  };

  order.stageHistory.push({
    stage: "Confirmed",
    note: `${serviceLabel(order.deliveryServiceType)} assigned automatically`,
    date: new Date()
  });

  worker.deliveryWorker.availabilityStatus = "busy";
  worker.deliveryWorker.isOnline = true;
  worker.deliveryWorker.lastSeenAt = new Date();

  await Promise.all([order.save(), worker.save()]);

  return {
    order,
    worker,
    assigned: true
  };
}