import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, PackageCheck, X } from "lucide-react";

import { useNotificationStore } from "../store/notificationStore";

export default function NotificationDrawer() {
  const {
    open,
    setOpen,
    notifications,
    markRead,
    markAllRead
  } = useNotificationStore();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[75] bg-lora-dark/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.aside
            className="absolute right-0 top-0 flex h-full w-[420px] max-w-full flex-col bg-white shadow-card"
            initial={{ x: 440 }}
            animate={{ x: 0 }}
            exit={{ x: 440 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
          >
            <div className="flex items-center justify-between border-b border-lora-dark/10 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-lora-green">
                  Updates
                </p>
                <h2 className="text-2xl font-black">Notifications</h2>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="grid h-11 w-11 place-items-center rounded-full bg-lora-mist"
              >
                <X size={19} />
              </button>
            </div>

            <div className="flex items-center justify-between border-b border-lora-dark/10 px-5 py-3">
              <span className="text-sm font-bold text-lora-dark/60">
                {notifications.length} total
              </span>

              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-2 rounded-full bg-lora-mist px-3 py-2 text-sm font-black text-lora-dark"
              >
                <CheckCheck size={15} />
                Read all
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {notifications.length === 0 ? (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <Bell className="mx-auto text-lora-green" size={40} />
                    <p className="mt-4 text-xl font-black">No notifications</p>
                    <p className="mt-2 text-sm text-lora-dark/60">
                      Order updates and promos will appear here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {notifications.map((notification) => {
                    const orderId = notification.metadata?.orderId;

                    return (
                      <div
                        key={notification._id}
                        className={`rounded-2xl p-4 ${
                          notification.read ? "bg-lora-mist" : "bg-lora-green text-white"
                        }`}
                      >
                        <div className="flex gap-3">
                          <span
                            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                              notification.read
                                ? "bg-white text-lora-green"
                                : "bg-white/20 text-white"
                            }`}
                          >
                            <PackageCheck size={18} />
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="font-black">{notification.title}</p>
                            <p
                              className={`mt-1 text-sm font-semibold ${
                                notification.read
                                  ? "text-lora-dark/60"
                                  : "text-white/80"
                              }`}
                            >
                              {notification.body}
                            </p>

                            <div className="mt-3 flex gap-2">
                              {!notification.read && (
                                <button
                                  onClick={() => markRead(notification._id)}
                                  className="rounded-full bg-white px-3 py-1 text-xs font-black text-lora-dark"
                                >
                                  Mark read
                                </button>
                              )}

                              {orderId && (
                                <Link
                                  to={`/tracking/${orderId}`}
                                  onClick={() => setOpen(false)}
                                  className="rounded-full bg-white px-3 py-1 text-xs font-black text-lora-dark"
                                >
                                  Track
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}