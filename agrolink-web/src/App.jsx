import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VerificationPending from './pages/VerificationPending';
import FarmerLayout from './components/farmer/FarmerLayout';
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import AddProduct from './pages/farmer/AddProduct';
import MyProducts from './pages/farmer/MyProducts';
import FarmerOrders from './pages/farmer/FarmerOrders';
import FarmerRequests from './pages/farmer/FarmerRequests';
import FarmerWallet from './pages/farmer/FarmerWallet';
// Support Pages
import FarmerSupport from './pages/farmer/FarmerSupport';
import DriverSupport from './pages/driver/DriverSupport';
import AdminSupport from './pages/admin/AdminSupport';

import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminDriverRegistration from './pages/admin/AdminDriverRegistration';
import UserVerification from './pages/admin/UserVerification';
import ProductReview from './pages/admin/ProductReview';
import OrderManagement from './pages/admin/OrderManagement';
import AdminFarmersShop from './pages/admin/AdminFarmersShop';
import LogisticsMap from './pages/admin/LogisticsMap';
import SellerKPIs from './pages/admin/SellerKPIs';

import SupplierLayout from './components/supplier/SupplierLayout';
import SupplierDashboard from './pages/supplier/SupplierDashboard';

import DriverLayout from './components/driver/DriverLayout';
import DriverDashboard from './pages/driver/DriverDashboard';
import ActiveTrip from './pages/driver/ActiveTrip';
import DriverWallet from './pages/driver/DriverWallet';
import VehicleProfile from './pages/driver/VehicleProfile';

import LiveTracking from './pages/buyer/LiveTracking';
import ProductDetails from './pages/marketplace/ProductDetails';
import Cart from './pages/marketplace/Cart';
import Checkout from './pages/marketplace/Checkout';
import MyOrders from './pages/buyer/MyOrders';
import PostRequest from './pages/marketplace/PostRequest';
import MyRequests from './pages/marketplace/MyRequests';
import Marketplace from './pages/marketplace/Marketplace';
import ChatApp from './pages/chat/ChatApp';
import ChatInbox from './pages/chat/ChatInbox';

import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/post-request" element={<PostRequest />} />
            <Route path="/my-requests" element={<MyRequests />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/chat/:conversationId" element={<ChatApp />} />
            <Route path="/inbox" element={<ChatInbox />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verification-pending" element={<VerificationPending />} />
            <Route path="/track" element={<LiveTracking />} />
            <Route path="/my-orders" element={<MyOrders />} />

            {/* Redirect for incorrect admin path */}
            <Route path="/dashboard/admin" element={<Navigate to="/admin/dashboard" replace />} />

            {/* Farmer Routes */}
            <Route path="/farmer" element={<FarmerLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<FarmerDashboard />} />
              <Route path="add-product" element={<AddProduct />} />
              <Route path="orders" element={<FarmerOrders />} />
              <Route path="requests" element={<FarmerRequests />} />
              <Route path="support" element={<FarmerSupport />} />
              <Route path="products" element={<MyProducts />} />
              <Route path="wallet" element={<FarmerWallet />} />
              <Route path="transport" element={<div className="p-10">Transport Page Coming Soon</div>} />
              <Route path="profile" element={<div className="p-10">Profile Page Coming Soon</div>} />
              <Route path="ai-advisor" element={<div className="p-10">AI Advisor Coming Soon</div>} />
              <Route path="insights" element={<div className="p-10">Insights Coming Soon</div>} />
            </Route>

            {/* Driver Routes */}
            <Route path="/driver" element={<DriverLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DriverDashboard />} />
              <Route path="active-trip" element={<ActiveTrip />} />
              <Route path="wallet" element={<DriverWallet />} />
              <Route path="vehicle" element={<VehicleProfile />} />
              <Route path="support" element={<DriverSupport />} />
            </Route>

            {/* Supplier Routes */}
            <Route path="/supplier" element={<SupplierLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<SupplierDashboard />} />
              <Route path="products" element={<SupplierDashboard />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="register-driver" element={<AdminDriverRegistration />} />
              <Route path="verification" element={<UserVerification />} />
              <Route path="products" element={<ProductReview />} />
              <Route path="orders" element={<OrderManagement />} />
              <Route path="farmers-shop" element={<AdminFarmersShop />} />
              <Route path="kpis" element={<SellerKPIs />} />
              <Route path="logistics" element={<LogisticsMap />} />
              <Route path="support" element={<AdminSupport />} />
              <Route path="settings" element={<div className="p-10 text-gray-500">Settings Coming Soon</div>} />
            </Route>

            {/* Fallback for unknown routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
