import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Navbar() {
  const { user, login, logout, hasRole } = useAuth();
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path
      ? "text-white"
      : "text-zinc-400 hover:text-white";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-sm shadow-lg shadow-indigo-500/30 group-hover:bg-indigo-500 transition">
            N
          </div>
          <span className="font-semibold tracking-tight text-white">
            Nova Role Play
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link
            to="/shop"
            className={`rounded-lg px-3 py-2 transition ${isActive("/shop")}`}
          >
            Vehicle Shop
          </Link>
          <Link
            to="/tickets"
            className={`rounded-lg px-3 py-2 transition ${isActive("/tickets")}`}
          >
            Tickets
          </Link>

          {hasRole("staff") && (
            <Link
              to="/admin"
              className={`rounded-lg px-3 py-2 transition ${isActive("/admin")}`}
            >
              Admin
            </Link>
          )}

          <div className="ml-3 flex items-center gap-3 border-l border-zinc-800 pl-4">
            {!user ? (
              <button onClick={login} className="btn-primary py-1.5 px-4 text-sm">
                Login with Discord
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="h-7 w-7 rounded-full ring-2 ring-zinc-700"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium">
                      {user.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:inline text-zinc-300 text-sm">
                    {user.username}
                  </span>
                </div>
                <button onClick={logout} className="btn-ghost py-1.5 px-3 text-sm">
                  Logout
                </button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}