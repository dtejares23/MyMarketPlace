"use client";
import { useEffect, useState } from "react";
import Login from "./pages/Login";

interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  stock: number;
  category_id: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [token, setToken] = useState<string>("");
  
  // Notification Toast State
  const [notification, setNotification] = useState<string | null>(null);

  // Filters & Tabs
  const [searchTerm, setSearchTerm] = useState("");
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [activeTab, setActiveTab] = useState<"store" | "cart" | "orders">("store");

  const API_URL = "http://localhost:8000";

  // Trigger temporary toast message
  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/products`);
      const json = await res.json();
      const items = json.data || [];
      setProducts(items);
      setFilteredProducts(items);
    } catch (err) {
      console.error("Failed to load catalog", err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    let result = products.filter(
      (p) =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        p.price <= maxPrice
    );
    setFilteredProducts(result);
  }, [searchTerm, maxPrice, products]);

  const fetchOrders = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/orders`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoginSuccess = (authToken: string) => {
    setToken(authToken);
    triggerNotification("Logged in successfully!");
    fetchOrders(authToken);
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    
    // Trigger notification popup
    triggerNotification(`🛒 Added "${product.title}" to your cart!`);
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== id));
  };

  const handleCheckout = async () => {
    if (!token) {
      triggerNotification("⚠️ Please log in first to proceed with checkout.");
      return;
    }
    for (const item of cart) {
      try {
        const res = await fetch(
          `${API_URL}/checkout/${item.product.id}?quantity=${item.quantity}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (!res.ok) {
          triggerNotification(`Checkout failed: ${data.detail}`);
          return;
        }
      } catch (err) {
        triggerNotification("Network error during checkout.");
        return;
      }
    }
    triggerNotification("🎉 Order placed successfully!");
    setCart([]);
    fetchProducts();
    fetchOrders(token);
    setActiveTab("orders");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6 font-sans relative">
      {/* Toast Notification Banner */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-gray-700 animate-bounce">
          <span>{notification}</span>
        </div>
      )}

      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border">
        <h1 className="text-2xl font-bold text-blue-600">Marketplace Storefront</h1>
        
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("store")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "store" ? "bg-blue-600 text-white" : "bg-gray-100"
            }`}
          >
            Catalog
          </button>
          <button
            onClick={() => setActiveTab("cart")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "cart" ? "bg-blue-600 text-white" : "bg-gray-100"
            }`}
          >
            Cart ({cart.reduce((a, b) => a + b.quantity, 0)})
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "orders" ? "bg-blue-600 text-white" : "bg-gray-100"
            }`}
          >
            Order History
          </button>
        </div>
      </header>

      {/* Render Decoupled Login Component */}
      {!token && (
        <div className="mb-8">
          <Login apiUrl={API_URL} onLoginSuccess={handleLoginSuccess} />
        </div>
      )}

      {/* CATALOG TAB */}
      {activeTab === "store" && (
        <div>
          <div className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-xl border">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border p-2 rounded-lg text-sm flex-1"
            />
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Max Price: ${maxPrice}</label>
              <input
                type="range"
                min="10"
                max="500"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredProducts.map((p) => (
              <div key={p.id} className="bg-white border rounded-xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{p.title}</h3>
                  <p className="text-gray-500 text-sm mt-1">{p.description || "No description available."}</p>
                  <p className="text-xl font-bold text-green-600 mt-3">${p.price}</p>
                  <p className="text-xs text-gray-400 mt-1">Stock: {p.stock}</p>
                </div>
                <button
                  onClick={() => addToCart(p)}
                  disabled={p.stock <= 0}
                  className={`mt-4 w-full py-2 rounded-lg font-semibold text-white transition ${
                    p.stock > 0 ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  {p.stock > 0 ? "Add to Cart" : "Out of Stock"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CART TAB */}
      {activeTab === "cart" && (
        <div className="bg-white p-6 rounded-xl border">
          <h2 className="text-xl font-bold mb-4">Shopping Cart</h2>
          {cart.length === 0 ? (
            <p className="text-gray-500">Your cart is empty.</p>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.product.id} className="flex justify-between items-center border-b pb-3">
                  <div>
                    <h4 className="font-semibold">{item.product.title}</h4>
                    <p className="text-sm text-gray-500">
                      ${item.product.price} x {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold">${(item.product.price * item.quantity).toFixed(2)}</span>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-red-500 text-sm hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-4">
                <span className="text-lg font-bold">Total Amount:</span>
                <span className="text-2xl font-bold text-green-600">
                  ${cart.reduce((a, b) => a + b.product.price * b.quantity, 0).toFixed(2)}
                </span>
              </div>
              <button
                onClick={handleCheckout}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition"
              >
                Proceed to Checkout
              </button>
            </div>
          )}
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === "orders" && (
        <div className="bg-white p-6 rounded-xl border">
          <h2 className="text-xl font-bold mb-4">Past Order History</h2>
          {!token ? (
            <p className="text-gray-500">Log in to view past order records.</p>
          ) : orders.length === 0 ? (
            <p className="text-gray-500">No order history available.</p>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="p-4 border rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-semibold">Order #{o.id}</p>
                    <p className="text-xs text-gray-500">Status: {o.status}</p>
                  </div>
                  <span className="font-bold text-green-600">${o.total_amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}