"use client";
import Login from "../pages/Login";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const handleLoginSuccess = (token: string) => {
    // Store token and redirect back to main catalog
    localStorage.setItem("token", token);
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white p-6 rounded-2xl border shadow-sm">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 text-center">Sign In / Register</h2>
        <Login apiUrl="http://localhost:8000" onLoginSuccess={handleLoginSuccess} />
      </div>
    </div>
  );
}