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
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  
  // Modals & UI States
  const [notification, setNotification] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Filters & Tabs
  const [searchTerm, setSearchTerm] = useState("");
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [activeTab, setActiveTab] = useState<"store" | "cart" | "orders">("store");

  const API_URL = "http://localhost:8000";

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      fetchOrders(savedToken);
    }
    setIsLoadingToken(false);
    fetchProducts();
  }, []);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const res = await fetch(`${API_URL}/products`);
      const json = await res.json();
      const items = json.data || [];
      setProducts(items);
      setFilteredProducts(items);
    } catch (err) {
      console.error("Failed to load catalog", err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

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
    localStorage.setItem("token", authToken);
    triggerNotification("Logged in successfully!");
    fetchOrders(authToken);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("token");
    setOrders([]);
    setCart([]);
    triggerNotification("Logged out successfully");
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
    triggerNotification(`🛒 Added "${product.title}" to your cart!`);
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== id));
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (delta > 0 && newQty > item.product.stock) {
              triggerNotification(`⚠️ Max available stock is ${item.product.stock}`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleCheckout = async () => {
    if (!token) {
      triggerNotification("⚠️ Please log in first to proceed with checkout.");
      return;
    }
    setIsCheckingOut(true);
    try {
      for (const item of cart) {
        const res = await fetch(
          `${API_URL}/checkout/${item.product.id}?quantity=${item.quantity}`,
          {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}` 
            },
          }
        );
        const data = await res.json();
        if (!res.ok) {
          triggerNotification(`Checkout failed: ${data.detail}`);
          setIsCheckingOut(false);
          return;
        }
      }
      triggerNotification("🎉 Order placed successfully!");
      setCart([]);
      fetchProducts();
      fetchOrders(token);
      setActiveTab("orders");
    } catch (err) {
      triggerNotification("Network error during checkout.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (isLoadingToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-6 font-sans">
        {notification && (
          <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-gray-700 animate-bounce">
            <span>{notification}</span>
          </div>
        )}
        <Login apiUrl={API_URL} onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6 font-sans relative">
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-gray-700 animate-bounce">
          <span>{notification}</span>
        </div>
      )}

      {isCheckingOut && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-xl border border-gray-100 text-center flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Processing Order</h3>
            <p className="text-sm text-gray-500">Securing inventory & processing checkout...</p>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-100 text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Logout Confirmation</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to log out of your session?</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2.5 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition text-sm flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  handleLogout();
                }}
                className="px-4 py-2.5 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 transition text-sm flex-1 shadow-sm"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border">
        <h1 className="text-2xl font-bold text-blue-600">Marketplace Storefront</h1>
        
        <div className="flex gap-3 items-center">
          <button
            onClick={() => setActiveTab("store")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "store" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Catalog
          </button>
          <button
            onClick={() => setActiveTab("cart")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "cart" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Cart ({cart.reduce((a, b) => a + b.quantity, 0)})
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "orders" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Order History
          </button>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="px-4 py-2 rounded-lg font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition ml-2 text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      {/* CATALOG TAB */}
      {activeTab === "store" && (
        <div>
          <div className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-xl border">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border p-2 rounded-lg text-sm flex-1 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Max Price: Php{maxPrice}</label>
              <input
                type="range"
                min="10"
                max="1000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="cursor-pointer"
              />
            </div>
          </div>

          {isLoadingProducts ? (
            <div className="bg-white border rounded-xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-medium text-gray-500">Fetching products from database...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white border rounded-xl p-8 text-center text-gray-500 text-sm">
              No products found matching your filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredProducts.map((p) => (
                <div key={p.id} className="bg-white border rounded-xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{p.title}</h3>
                    <p className="text-gray-500 text-sm mt-1">{p.description || "No description available."}</p>
                    <p className="text-xl font-bold text-green-600 mt-3">Php{p.price}</p>
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
          )}
        </div>
      )}

      {/* CART TAB */}
      {activeTab === "cart" && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Shopping Cart</h2>
          {cart.length === 0 ? (
            <p className="text-gray-500 text-sm">Your cart is empty.</p>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.product.id} className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">{item.product.title}</h4>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Php{item.product.price} each
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center border border-gray-300 rounded-lg bg-gray-50 overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-8 h-8 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-200 transition"
                        title="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="w-10 text-center font-semibold text-sm text-gray-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        disabled={item.quantity >= item.product.stock}
                        className={`w-8 h-8 flex items-center justify-center font-bold transition ${
                          item.quantity >= item.product.stock
                            ? "text-gray-300 bg-gray-100 cursor-not-allowed"
                            : "text-gray-700 hover:bg-gray-200"
                        }`}
                        title="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <span className="font-bold text-gray-900 min-w-[80px] text-right">
                      Php{(item.product.price * item.quantity).toFixed(2)}
                    </span>

                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-red-500 text-sm hover:text-red-700 hover:underline font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center pt-4">
                <span className="text-lg font-bold text-gray-800">Total Amount:</span>
                <span className="text-2xl font-bold text-green-600">
                  Php{cart.reduce((a, b) => a + b.product.price * b.quantity, 0).toFixed(2)}
                </span>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold transition shadow-sm"
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
          {orders.length === 0 ? (
            <p className="text-gray-500">No order history available.</p>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="p-4 border rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-semibold">Order #{o.id}</p>
                    <p className="text-xs text-gray-500">Status: {o.status}</p>
                  </div>
                  <span className="font-bold text-green-600">Php{o.total_amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}