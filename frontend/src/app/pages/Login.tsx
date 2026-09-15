"use client";
import { useState } from "react";

interface AuthProps {
  apiUrl: string;
  onLoginSuccess: (token: string) => void;
}

export default function Login({ apiUrl, onLoginSuccess }: AuthProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const endpoint = isRegistering ? "/auth/register" : "/auth/login";
    const payload = isRegistering
      ? { email, password, role: "user" }
      : { email, password };

    try {
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        if (isRegistering) {
          setMessage({ text: "Account created successfully! You can now log in.", isError: false });
          setIsRegistering(false);
        } else {
          onLoginSuccess(data.access_token);
        }
      } else {
        setMessage({ text: data.detail || "Authentication failed", isError: true });
      }
    } catch (err) {
      setMessage({ text: "Network error connecting to API", isError: true });
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white p-8 rounded-2xl border border-gray-200 shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isRegistering ? "Create an Account" : "Sign In to Marketplace"}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {isRegistering ? "Register to start shopping" : "Enter your credentials to access your store"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Email Address
          </label>
          <input
            type="email"
            placeholder="name@example.com"
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
          className={`w-full py-3.5 mt-2 rounded-xl font-semibold text-white transition shadow-sm ${
            isRegistering
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isRegistering ? "Create Account" : "Sign In"}
        </button>

        {message && (
          <p
            className={`text-xs text-center font-medium p-3 rounded-lg ${
              message.isError
                ? "bg-red-50 text-red-600 border border-red-200"
                : "bg-green-50 text-green-600 border border-green-200"
            }`}
          >
            {message.text}
          </p>
        )}

        <div className="text-center pt-4 border-t border-gray-100 mt-2">
          {isRegistering ? (
            <button
              type="button"
              onClick={() => {
                setIsRegistering(false);
                setMessage(null);
              }}
              className="text-xs text-gray-600 hover:text-gray-900 font-medium hover:underline"
            >
              ← Back to Sign In
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsRegistering(true);
                setMessage(null);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
            >
              Don't have an account? Register Now
            </button>
          )}
        </div>
      </form>
    </div>
  );
}