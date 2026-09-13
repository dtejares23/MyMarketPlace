"use client";
import { useState } from "react";

interface LoginProps {
  apiUrl: string;
  onLoginSuccess: (token: string) => void;
}

export default function Login({ apiUrl, onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        onLoginSuccess(data.access_token);
      } else {
        setErrorMsg(data.detail || "Invalid credentials");
      }
    } catch (err) {
      setErrorMsg("Network error during login");
    }
  };

  return (
    <form onSubmit={handleLogin} className="p-4 bg-white border rounded-xl flex flex-wrap gap-3 items-center shadow-sm">
      <span className="text-sm font-semibold text-gray-700">Account Login:</span>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
        required
      />
      <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-semibold transition">
        Login
      </button>
      {errorMsg && <span className="text-xs text-red-500 font-medium">{errorMsg}</span>}
    </form>
  );
}