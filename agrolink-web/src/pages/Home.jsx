import React, { useState, useEffect } from 'react';
import { ShoppingCart, User, Search, Menu, X, Leaf, Truck, ShieldCheck, LayoutDashboard, LogOut, ChevronDown, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import MarketplaceSection from '../components/marketplace/MarketplaceSection';
import NotificationDropdown from '../components/common/NotificationDropdown';

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { cart, getCartCount } = useCart();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [userStatus, setUserStatus] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(false);

  const fetchProfile = () => {
    if (user?.id) {
      setProfileLoading(true);
      setProfileError(false);
      // Fetch profile to get role
      axios.get(`/api/profiles/${user.id}`)
        .then(res => {
          setUserRole(res.data.role);
          setUserStatus(res.data.status);
          localStorage.setItem('userRole', res.data.role); // Optional cache
        })
        .catch(err => {
          console.error("Failed to fetch profile", err);
          setProfileError(true);
          // try fallback cache
          const cachedRole = localStorage.getItem('userRole');
          if (cachedRole) setUserRole(cachedRole);
        })
        .finally(() => setProfileLoading(false));
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    localStorage.removeItem('userRole');
    await signOut();
    navigate('/');
    window.location.reload(); // Ensure clean state
  };

  const getDashboardLink = () => {
    switch (userRole) {
      case 'admin': return '/admin/dashboard';
      case 'farmer': return '/farmer/dashboard';
      case 'driver': return '/driver/dashboard';
      case 'supplier': return '/supplier/dashboard';
      default: return '/'; // Buyer stays on home
    }
  };

  return (
    <div className="min-h-screen font-sans text-gray-800">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm text-gray-800 z-50 shadow-sm border-b border-gray-100">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold tracking-tight text-[#1a7935]">AgroLink</span>
          </a>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8 ml-8">
            <a href="/marketplace" className="hover:text-[#1a7935] transition-colors font-medium">Farmers Shop</a>
            <a href="#marketplace" className="hover:text-[#1a7935] transition-colors font-medium">Marketplace</a>
            <a href="#" className="hover:text-[#1a7935] transition-colors font-medium">Categories</a>
            <a href="#" className="hover:text-[#1a7935] transition-colors font-medium">About</a>
            <a href="#" className="hover:text-[#1a7935] transition-colors font-medium">Contact Center</a>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
            <input
              type="text"
              placeholder="Search products..."
              className="w-full pl-5 pr-10 py-2.5 rounded-full bg-gray-100 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7935]/20 focus:border-[#1a7935] transition-all"
            />
            <Search className="absolute right-4 top-2.5 h-5 w-5 text-gray-400" />
          </div>

          {/* Right Icons */}
          <div className="hidden md:flex items-center space-x-6">
            <div
              onClick={() => navigate('/cart')}
              className="relative cursor-pointer hover:text-[#1a7935] transition-colors"
            >
              <ShoppingCart className="h-6 w-6" />
              {getCartCount() > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#db1c1c] text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {getCartCount()}
                </span>
              )}
            </div>

            {/* Notification Bell (Only if logged in) */}
            {user && (
              <div className="mr-2">
                <NotificationDropdown userId={user.id} />
              </div>
            )}

            {/* User Icon with Hover Menu */}
            <div className="relative group z-50">
              <div className="cursor-pointer hover:text-[#1a7935] transition-colors py-2 flex items-center gap-1">
                {user ? (
                  <>
                    <div className="w-8 h-8 rounded-full bg-[#1a7935] text-white flex items-center justify-center font-bold text-sm shadow-md border-2 border-white ring-2 ring-[#1a7935]/20">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-500 group-hover:text-[#1a7935] transition-colors" />
                  </>
                ) : (
                  <User className="h-6 w-6" />
                )}
              </div>

              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform group-hover:translate-y-0 translate-y-2 origin-top-right">
                {user ? (
                  <div className="py-2">
                    <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Signed in as</p>
                      <p className="text-sm font-medium text-gray-900 truncate" title={user.email}>{user.email}</p>
                      {/* Loading State or Role Display */}
                      {profileLoading ? (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 italic">
                          <span>Loading role...</span>
                        </p>
                      ) : userRole ? (
                        <p className="text-xs text-[#1a7935] mt-1 capitalize font-semibold">{userRole}</p>
                      ) : profileError ? (
                        <p className="text-[10px] text-red-500 mt-1 flex items-center justify-between">
                          Failed to load role
                          <button onClick={fetchProfile} className="underline font-semibold hover:text-red-700">Retry</button>
                        </p>
                      ) : null}
                    </div>

                    <div className="py-1">
                      {/* Links container */}
                      {profileLoading && !userRole && (
                        <div className="px-4 py-2 text-xs text-gray-400 italic text-center animate-pulse">
                          Fetching your menu...
                        </div>
                      )}

                      {!profileLoading && userRole && (
                        <>
                          {userRole !== 'buyer' && (userStatus === 'approved' || localStorage.getItem('userRole') === 'admin') && (
                            <button
                              onClick={() => navigate(getDashboardLink())}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-[#1a7935] flex items-center transition-colors"
                            >
                              <LayoutDashboard className="h-4 w-4 mr-2" />
                              Dashboard
                            </button>
                          )}

                          {/* Verification Status for Non-Approved Users */}
                          {(userRole === 'farmer' || userRole === 'driver' || userRole === 'supplier') && userStatus !== 'approved' && (
                            <div className="px-4 py-2 text-xs text-amber-600 bg-amber-50 mx-2 rounded border border-amber-200 mb-1">
                              Verification Pending
                            </div>
                          )}
                          {/* For buyers */}
                          {userRole === 'buyer' && (
                            <>
                              <button
                                onClick={() => navigate('/my-orders')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-[#1a7935] flex items-center transition-colors"
                              >
                                <ShoppingBag className="h-4 w-4 mr-2" />
                                My Orders
                              </button>
                              <button
                                onClick={() => navigate('/post-request')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-[#1a7935] flex items-center transition-colors"
                              >
                                <LayoutDashboard className="h-4 w-4 mr-2" />
                                Post Request
                              </button>
                              <button
                                onClick={() => navigate('/my-requests')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-[#1a7935] flex items-center transition-colors"
                              >
                                <LayoutDashboard className="h-4 w-4 mr-2" />
                                My Requests
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>

                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Log Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-2">
                    <a href="/login" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-[#1a7935] font-medium transition-colors">
                      Login
                    </a>
                    <a href="/register" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-[#1a7935] font-medium transition-colors">
                      Register
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Header Icons */}
          <div className="md:hidden flex items-center gap-4">
            {/* Cart Icon Mobile */}
            <div
              onClick={() => navigate('/cart')}
              className="relative cursor-pointer text-gray-800"
            >
              <ShoppingCart className="h-6 w-6" />
              {getCartCount() > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#db1c1c] text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {getCartCount()}
                </span>
              )}
            </div>

            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="focus:outline-none text-gray-800">
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 pb-4 px-4 shadow-lg">
            <div className="flex flex-col space-y-3 pt-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 mb-2 focus:outline-none focus:ring-2 focus:ring-[#1a7935]"
                />
                <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-500" />
              </div>
              <a href="/marketplace" className="block py-2 border-b border-gray-100 hover:text-[#1a7935]">Farmers Shop</a>
              <a href="#marketplace" className="block py-2 border-b border-gray-100 hover:text-[#1a7935]">Marketplace</a>
              <a href="#" className="block py-2 border-b border-gray-100 hover:text-[#1a7935]">Categories</a>
              <a href="#" className="block py-2 border-b border-gray-100 hover:text-[#1a7935]">About</a>
              <a href="#" className="block py-2 hover:text-[#1a7935]">Contact Center</a>

              {user ? (
                <>
                  <>
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-[#1a7935] text-white flex items-center justify-center font-bold text-sm">
                          {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user.email}</p>
                          {profileLoading ? (
                            <p className="text-xs text-gray-500 italic">Loading role...</p>
                          ) : userRole ? (
                            <p className="text-xs text-gray-500 capitalize">{userRole}</p>
                          ) : profileError ? (
                            <button onClick={fetchProfile} className="text-xs text-red-500 underline">Failed. Retry?</button>
                          ) : null}
                        </div>
                      </div>

                      {profileLoading && !userRole && (
                        <p className="text-xs text-gray-400 italic py-2 animate-pulse">Loading menu items...</p>
                      )}

                      {!profileLoading && userRole && (
                        <>
                          {userRole !== 'buyer' && (userStatus === 'approved' || localStorage.getItem('userRole') === 'admin') && (
                            <button
                              onClick={() => navigate(getDashboardLink())}
                              className="block w-full text-left py-2 hover:text-[#1a7935] font-medium transition-colors"
                            >
                              Dashboard
                            </button>
                          )}

                          {(userRole === 'farmer' || userRole === 'driver' || userRole === 'supplier') && userStatus !== 'approved' && (
                            <div className="px-2 py-1 text-xs text-amber-600 bg-amber-50 rounded border border-amber-200 mb-2 w-fit">
                              Verification Pending
                            </div>
                          )}

                          {userRole === 'buyer' && (
                            <>
                              <button
                                onClick={() => navigate('/my-orders')}
                                className="block w-full text-left py-2 hover:text-[#1a7935] font-medium transition-colors"
                              >
                                My Orders
                              </button>
                              <button
                                onClick={() => navigate('/post-request')}
                                className="block w-full text-left py-2 hover:text-[#1a7935] font-medium transition-colors"
                              >
                                Post Request
                              </button>
                              <button
                                onClick={() => navigate('/my-requests')}
                                className="block w-full text-left py-2 hover:text-[#1a7935] font-medium transition-colors"
                              >
                                My Requests
                              </button>
                            </>
                          )}
                        </>
                      )}

                      <button onClick={handleLogout} className="block w-full text-left py-2 text-red-600 hover:bg-red-50 rounded mt-2">Log Out</button>
                    </div>
                  </>
                </>
              ) : (
                <>
                  <a href="/login" className="block py-2 border-b border-gray-100 hover:text-[#1a7935] font-medium text-gray-700">Login</a>
                  <a href="/register" className="block py-2 hover:text-[#1a7935] font-bold text-[#1a7935]">Register</a>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden bg-[#f8fafc]">
        {/* Background Image - Farmer & Paddy Field */}
        <div className="absolute inset-0 z-0">
          <img
            src="/12345frgg.png"
            alt="Sri Lankan Farmer in Paddy Field"
            className="w-full h-full object-cover object-center"
          />
          {/* Heavy White Gradient Fade for Text Readability - Left to Right */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/70 to-transparent"></div>
          {/* Bottom soft fade */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f8fafc] to-transparent"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 mt-8">
          <div className="max-w-3xl animate-fade-in-up pt-10">
            {/* Badge */}
            <div className="inline-block bg-white/90 backdrop-blur-md rounded-full px-4 py-1.5 mb-8 border border-green-100 shadow-sm">
              <span className="text-[#1a7935] font-semibold text-sm tracking-wide">#1 Agriculture Platform in Sri Lanka</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-[#0f2815] mb-8 leading-[1.15] tracking-tight">
              ඔබේ අස්වැන්නට <span className="text-[#1a7935]">හොඳම</span> <br />
              <span className="text-[#1a7935]">මිලක්</span>, <br />
              ගොවිතැනට නව තාක්ෂණයක්.
            </h1>

            <p className="text-lg md:text-xl text-gray-700 mb-10 max-w-2xl leading-relaxed font-medium bg-white/30 backdrop-blur-[1px] rounded-lg p-2 -ml-2">
              ගොවීන්, ගැනුම්කරුවන් සහ ප්‍රවාහනය කරන්නන් එකම වේදිකාවකට ගෙන එන ශ්‍රී ලංකාවේ විශ්වාසවන්තම කෘෂිකාර්මික ජාලය. AgroLink සමඟ සම්බන්ධ වී ඔබේ ව්‍යාපාරය දියුණු කරගන්න.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <a href="/register" className="bg-[#1a7935] text-white hover:bg-[#145d29] px-8 py-4 rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center">
                දැන්ම ආරම්භ කරන්න
              </a>
              <button className="bg-white/80 border-2 border-[#1a7935] text-[#1a7935] hover:bg-[#1a7935] hover:text-white px-8 py-4 rounded-lg font-bold text-lg transition-all shadow-md hover:shadow-lg backdrop-blur-sm">
                වැඩි විස්තර
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-12 text-sm font-semibold text-[#0f2815]">
              <div className="flex items-center gap-2 bg-white/50 px-3 py-1 rounded-full backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-[#1a7935]"></div>
                විශ්වාසවන්ත සේවාව
              </div>
              <div className="flex items-center gap-2 bg-white/50 px-3 py-1 rounded-full backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-[#1a7935]"></div>
                නිවැරදි වෙළඳපොළ මිල
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#1a7935] mb-4">අපගේ සේවාවන්</h2>
            <div className="w-24 h-1.5 bg-[#b0db3d] mx-auto rounded-full"></div>
            <p className="text-gray-500 mt-4 max-w-2xl mx-auto">අපි ඔබ වෙනුවෙන් සපයන විශිෂ්ට සේවාවන් කිහිපයක්</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-t-4 border-[#1a7935] transform hover:-translate-y-2 group">
              <div className="bg-[#e8f5e9] w-20 h-20 rounded-full flex items-center justify-center mb-6 mx-auto text-[#1a7935] group-hover:bg-[#1a7935] group-hover:text-white transition-colors">
                <Leaf className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold text-center mb-4 text-gray-800">නැවුම් අස්වැන්න</h3>
              <p className="text-gray-600 text-center leading-relaxed">
                ගොවිබිමේ සිට කෙලින්ම ඔබගේ නිවසටම ඉතාමත් විශ්වාසවන්තව සහ නැවුම්ව ලබා ගැනීමේ හැකියාව.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-t-4 border-[#b0db3d] transform hover:-translate-y-2 group">
              <div className="bg-[#f9fbe7] w-20 h-20 rounded-full flex items-center justify-center mb-6 mx-auto text-[#b0db3d] group-hover:bg-[#b0db3d] group-hover:text-white transition-colors">
                <Truck className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold text-center mb-4 text-gray-800">දිවයින පුරා බෙදාහැරීම</h3>
              <p className="text-gray-600 text-center leading-relaxed">
                කාර්යක්ෂම ප්‍රවාහන සේවාව හරහා ඔබේ ඇණවුම ආරක්ෂිතව සහ ඉක්මනින් ඔබ වෙතට.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-t-4 border-[#db1c1c] transform hover:-translate-y-2 group">
              <div className="bg-[#ffebee] w-20 h-20 rounded-full flex items-center justify-center mb-6 mx-auto text-[#db1c1c] group-hover:bg-[#db1c1c] group-hover:text-white transition-colors">
                <ShieldCheck className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold text-center mb-4 text-gray-800">ආරක්ෂිත ගනුදෙනු</h3>
              <p className="text-gray-600 text-center leading-relaxed">
                විනිවිද පෙනෙන මිල ගණන් සහ ඉතාමත් ආරක්ෂිත බැංකු ගෙවීම් ක්‍රම සමඟින් විශ්වාසය.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Marketplace Section */}
      <MarketplaceSection />

      {/* Contact Banner */}
      <section className="bg-[#1a7935] py-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-[#b0db3d] rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-[#b0db3d] rounded-full opacity-20 blur-3xl"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl font-bold text-white mb-6">ඔබත් අදම අප සමඟ එක්වන්න</h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">ගොවි මහතුන් සහ පාරිභෝගිකයින් යා කරන කෘෂි වෙළඳපොළ</p>
          <a href="/register" className="bg-white text-[#1a7935] px-8 py-3 rounded-full font-bold hover:bg-[#b0db3d] hover:text-[#1a7935] transition-colors shadow-lg inline-block">
            ගිණුමක් ආරම්භ කරන්න
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f4c20] text-white pt-16 pb-8 border-t border-[#1a7935]">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <Leaf className="h-8 w-8 text-[#b0db3d]" />
              <span className="text-3xl font-bold tracking-tighter">AgroLink</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              ශ්‍රී ලංකාවේ කෘෂිකර්මාන්තය ඩිජිටල් තාක්ෂණයෙන් සහ බලගන්වන, ගොවියාට හොඳම මිළත් පාරිභෝගිකයාට ඉහළම ගුණාත්මක බවත් ලබා දෙන එකම වේදිකාව.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-6 text-[#b0db3d]">ඉක්මන් සබැඳි</h4>
            <ul className="space-y-3 text-sm text-gray-300">
              <li><a href="#" className="hover:text-white transition-colors flex items-center"><span className="w-1.5 h-1.5 bg-[#b0db3d] rounded-full mr-2"></span>මුල් පිටුව</a></li>
              <li><a href="#" className="hover:text-white transition-colors flex items-center"><span className="w-1.5 h-1.5 bg-[#b0db3d] rounded-full mr-2"></span>වෙළඳපොළ</a></li>
              <li><a href="#" className="hover:text-white transition-colors flex items-center"><span className="w-1.5 h-1.5 bg-[#b0db3d] rounded-full mr-2"></span>අප ගැන</a></li>
              <li><a href="#" className="hover:text-white transition-colors flex items-center"><span className="w-1.5 h-1.5 bg-[#b0db3d] rounded-full mr-2"></span>පෞද්ගලිකත්ව ප්‍රතිපත්ති</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-6 text-[#b0db3d]">සම්බන්ධ වන්න</h4>
            <ul className="space-y-4 text-sm text-gray-300">
              <li className="flex items-start space-x-3">
                <div className="mt-1"><span className="text-[#b0db3d]">📍</span></div>
                <span>නො. 123, කෘෂි මාවත,<br />කොළඹ 07, ශ්‍රී ලංකාව</span>
              </li>
              <li className="flex items-center space-x-3">
                <span className="text-[#b0db3d]">📞</span>
                <span>011 2 345 678</span>
              </li>
              <li className="flex items-center space-x-3">
                <span className="text-[#b0db3d]">✉️</span>
                <span>hello@agrolink.lk</span>
              </li>
            </ul>
          </div>
          {/* Newsletter */}
          <div>
            <h4 className="font-bold text-lg mb-6 text-[#b0db3d]">පුවත් පත්‍රිකාව</h4>
            <p className="text-xs text-gray-400 mb-4">අලුත්ම තොරතුරු දැනගන්න අපගේ පුවත් පත්‍රිකාවට සම්බන්ධ වන්න.</p>
            <div className="flex">
              <input type="email" placeholder="ඔබේ විද්‍යුත් ලිපිනය" className="px-4 py-2 text-gray-800 rounded-l-lg w-full focus:outline-none text-sm" />
              <button className="bg-[#b0db3d] text-[#1a7935] px-4 py-2 rounded-r-lg font-bold hover:bg-white transition-colors">
                එවන්න
              </button>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-[#1a7935]/50 text-center text-sm text-gray-400 flex flex-col md:flex-row justify-between items-center">
          <p>&copy; 2026 AgroLink. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-white">Facebook</a>
            <a href="#" className="hover:text-white">Twitter</a>
            <a href="#" className="hover:text-white">Instagram</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
