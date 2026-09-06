import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="container-nrp py-8">
      <h1 className="text-2xl font-bold">Login</h1>
      <p className="mt-2 text-zinc-600">Sign in with Discord to access your dashboard.</p>

      <button onClick={login} className="btn-primary mt-4">
        Login with Discord
      </button>
    </div>
  );
}