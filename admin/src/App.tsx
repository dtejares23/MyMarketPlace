import { useEffect, useState } from "react";
import Login from "./Login/Login";

interface Product {
  id?: number;
  title: string;
  description: string;
  price: number;
  stock: number;
  category_id: number;
}

interface Order {
  id: number;
  user_id: number;
  total_amount: number;
  status: string;
  created_at?: string;
}

interface Category {
  id: number;
  name: string;
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "products" | "categories">("orders");

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [newProduct, setNewProduct] = useState<Product>({
    title: "",
    description: "",
    price: 0,
    stock: 0,
    category_id: 1,
  });
  const [newCategoryName, setNewCategoryName] = useState("");

  const API_URL = "http://localhost:8000";

  useEffect(() => {
    const savedToken = localStorage.getItem("admin_token");
    if (savedToken) {
      setToken(savedToken);
      fetchDashboardData(savedToken);
    }
    setIsLoadingToken(false);
  }, []);

  const fetchDashboardData = (authToken: string) => {
    fetchOrders(authToken);
    fetchProducts();
    fetchCategories();
  };

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
      console.error("Failed to load orders", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/products`);
      const json = await res.json();
      setProducts(json.data || []);
    } catch (err) {
      console.error("Failed to load products", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        if (data.length > 0 && newProduct.category_id === 1) {
          setNewProduct((prev) => ({ ...prev, category_id: data[0].id }));
        }
      }
    } catch (err) {
      console.error("Failed to load categories", err);
    }
  };

  const handleLoginSuccess = (authToken: string) => {
    setToken(authToken);
    localStorage.setItem("admin_token", authToken);
    fetchDashboardData(authToken);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("admin_token");
    setOrders([]);
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchOrders(token!);
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newProduct),
      });
      if (res.ok) {
        setNewProduct({ title: "", description: "", price: 0, stock: 0, category_id: categories[0]?.id || 1 });
        fetchProducts();
      }
    } catch (err) {
      alert("Error adding product");
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`${API_URL}/products/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchProducts();
    } catch (err) {
      alert("Error deleting product");
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newCategoryName }),
      });
      if (res.ok) {
        setNewCategoryName("");
        fetchCategories();
      }
    } catch (err) {
      alert("Error adding category");
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 font-sans">
        <Login apiUrl={API_URL} onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6 font-sans relative">
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-100 text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Logout Confirmation</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to end your admin session?</p>
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

      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-blue-600">Admin Management Console</h1>

        <div className="flex gap-3 items-center">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "orders" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "products" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "categories" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Categories
          </button>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="px-4 py-2 rounded-lg font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition ml-2 text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      {activeTab === "orders" && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Customer Orders</h2>
          {orders.length === 0 ? (
            <p className="text-gray-500 text-sm">No orders recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="p-3">Order ID</th>
                    <th className="p-3">User ID</th>
                    <th className="p-3">Total Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 transition">
                      <td className="p-3 font-semibold">#{o.id}</td>
                      <td className="p-3 text-gray-600">User #{o.user_id}</td>
                      <td className="p-3 font-bold text-green-600">Php{o.total_amount}</td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${
                            o.status === "Completed"
                              ? "bg-green-100 text-green-700"
                              : o.status === "Shipped"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {o.status || "Pending"}
                        </span>
                      </td>
                      <td className="p-3">
                        <select
                          value={o.status || "Pending"}
                          onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                          className="border border-gray-300 rounded-lg p-1.5 text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "products" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <form onSubmit={handleCreateProduct} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
            <h3 className="font-bold text-lg text-gray-900">Add New Product</h3>
            <input
              type="text"
              placeholder="Product Title"
              value={newProduct.title}
              onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
              className="border p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <textarea
              placeholder="Description"
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              className="border p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Price (PHP)"
              value={newProduct.price || ""}
              onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
              className="border p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="number"
              placeholder="Stock Quantity"
              value={newProduct.stock || ""}
              onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
              className="border p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <select
              value={newProduct.category_id}
              onChange={(e) => setNewProduct({ ...newProduct, category_id: Number(e.target.value) })}
              className="border p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition">
              Save Product
            </button>
          </form>

          <div className="md:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Inventory List</h3>
            <div className="space-y-3">
              {products.map((p) => (
                <div key={p.id} className="flex justify-between items-center p-4 border rounded-xl hover:bg-gray-50 transition">
                  <div>
                    <h4 className="font-bold text-gray-900">{p.title}</h4>
                    <p className="text-xs text-gray-500">Stock: {p.stock} units</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-green-600">Php{p.price}</span>
                    <button
                      onClick={() => handleDeleteProduct(p.id!)}
                      className="text-red-500 hover:text-red-700 text-xs font-semibold underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "categories" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <form onSubmit={handleCreateCategory} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
            <h3 className="font-bold text-lg text-gray-900">Create Category</h3>
            <input
              type="text"
              placeholder="Category Name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="border p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition">
              Add Category
            </button>
          </form>

          <div className="md:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Categories List</h3>
            <div className="space-y-2">
              {categories.map((c) => (
                <div key={c.id} className="p-3 border rounded-lg flex justify-between items-center text-sm font-semibold text-gray-800">
                  <span>{c.name}</span>
                  <span className="text-xs text-gray-400">ID: {c.id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}