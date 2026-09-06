import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Navbar() {
  const { user, login, logout, hasRole } = useAuth();

  return (
    <div className="border-b bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <Link to="/" className="font-bold tracking-wide">
          Nova Role Play
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <Link to="/shop" className="hover:underline">Vehicle Shop</Link>
          <Link to="/tickets" className="hover:underline">Tickets</Link>

          {hasRole("staff") && (
            <Link to="/admin" className="hover:underline">Admin</Link>
          )}

          {!user ? (
            <button onClick={login} className="rounded bg-indigo-600 px-3 py-1">
              Login with Discord
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-zinc-300">{user.username}</span>
              <button onClick={logout} className="rounded bg-zinc-800 px-3 py-1">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}