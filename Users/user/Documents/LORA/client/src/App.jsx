import { Navigate, Route, Routes } from "react-router-dom";
import Shell from "./components/Shell";
import Home from "./pages/Home";
import AuthPage from "./pages/AuthPage";
import { useAuthStore } from "./store/authStore";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import Checkout from "./pages/Checkout";
import Tracking from "./pages/Tracking";
import RiderDashboard from "./pages/RiderDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ComplaintPage from "./pages/ComplaintPage";
import ProfileSettings from "./pages/ProfileSettings";
import OrderHistory from "./pages/OrderHistory";
import WishlistPage from "./pages/WishlistPage";
import PaymentCallback from "./pages/PaymentCallback";

function RequireAuth({ children }) {
  const user = useAuthStore((state) => state.user);

  return user ? children : <Navigate to="/auth" replace />;
}

function RequireRole({ role, roles, children }) {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const allowedRoles = roles || [role];

  if (!allowedRoles.includes(user.role)) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (["rider", "deliveryBoy"].includes(user.role)) {
      return <Navigate to="/rider" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<AuthPage />} />

        <Route path="/products" element={<Products />} />
        <Route path="/products/:slug" element={<ProductDetails />} />

        <Route
          path="/checkout"
          element={
            <RequireAuth>
              <Checkout />
            </RequireAuth>
          }
        />

        <Route
          path="/tracking/:orderId"
          element={
            <RequireAuth>
              <Tracking />
            </RequireAuth>
          }
        />

        <Route
          path="/orders"
          element={
            <RequireAuth>
              <OrderHistory />
            </RequireAuth>
          }
        />

        <Route
          path="/payment/callback"
          element={
            <RequireAuth>
              <PaymentCallback />
            </RequireAuth>
          }
        />

        <Route
          path="/wishlist"
          element={
            <RequireAuth>
              <WishlistPage />
            </RequireAuth>
          }
        />

        <Route
          path="/settings"
          element={
            <RequireAuth>
              <ProfileSettings />
            </RequireAuth>
          }
        />

        <Route
          path="/complaints"
          element={
            <RequireAuth>
              <ComplaintPage />
            </RequireAuth>
          }
        />

        <Route
          path="/rider"
          element={
            <RequireRole roles={["rider", "deliveryBoy"]}>
              <RiderDashboard />
            </RequireRole>
          }
        />

        <Route
          path="/admin"
          element={
            <RequireRole role="admin">
              <AdminDashboard />
            </RequireRole>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}