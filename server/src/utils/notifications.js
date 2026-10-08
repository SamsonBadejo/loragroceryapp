import { Notification } from "../models/Notification.js";

export async function createNotification({
  user,
  title,
  body,
  type = "system",
  metadata = {}
}) {
  return Notification.create({
    user,
    title,
    body,
    type,
    metadata
  });
}