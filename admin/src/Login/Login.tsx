import { useState } from "react";

interface LoginProps {
  apiUrl: string;
  onLoginSuccess: (token: string) => void;
}

export default function Login({ apiUrl, onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        if (data.role !== "admin") {
          setError("Access denied. Admin credentials required.");
          setLoading(false);
          return;
        }
        onLoginSuccess(data.access_token);
      } else {
        setError(data.detail || "Invalid login credentials.");
      }
    } catch (err) {
      setError("Network error connecting to API server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-gray-200 shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Admin Control Panel</h2>
        <p className="text-sm text-gray-500 mt-1">Sign in to manage inventory and orders</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Admin Email
          </label>
          <input
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 mt-2 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
        >
          {loading ? "Authenticating..." : "Sign In to Admin"}
        </button>

        {error && (
          <p className="text-xs text-center font-medium p-3 rounded-lg bg-red-50 text-red-600 border border-red-200">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}