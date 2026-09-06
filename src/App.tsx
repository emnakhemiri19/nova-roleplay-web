import { Routes, Route } from "react-router-dom";

import { ProtectedRoute } from "./app/auth/ProtectedRoute";
import { Navbar } from "./app/components/Navbar";
import Home from "./app/pages/Home";
import Shop from "./app/pages/Shop";
import Login from "./app/pages/Login";
import Dashboard from "./app/pages/Dashboard";
import Tickets from "./app/pages/Tickets";
import Admin from "./app/pages/Admin";

export default function App() {
  return (
    <div className="min-h-screen pt-16">
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tickets"
          element={
            <ProtectedRoute>
              <Tickets />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute requireRoles={["staff", "admin"]}>
              <Admin />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}