import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    PackagePlus,
    ShoppingBasket,
    Truck,
    Wallet,
    TrendingUp,
    User,
    LogOut,
    Menu,
    X,
    Sprout,
    LifeBuoy,
    Bell,
    MessageCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useSyncFarmerLocation } from '../../hooks/useFarmerTracking';
import NotificationDropdown from '../common/NotificationDropdown';
import Chatbot from '../IT24100581/Chatbot';

export default function FarmerLayout() {
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [userId, setUserId] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Global Location Sync for Farmer
    // This ensures location works on ANY farmer page, not just Orders
    const { location: gpsLocation } = useGeolocation(true);
    useSyncFarmerLocation(gpsLocation, true, 10000);

    useEffect(() => {
        const checkStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login');
                return;
            }
            setUserId(user.id);

            try {
                // We should use axios for consistency if possible, or direct supabase query
                // Since user is logged in, we can query profiles
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role, status')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;

                if (profile.role === 'farmer' && profile.status !== 'approved') {
                    navigate('/verification-pending');
                } else if (profile.role !== 'farmer' && profile.role !== 'admin') {
                    // Basic role protection (optional but good)
                    navigate('/');
                }
            } catch (error) {
                console.error("Error checking farmer status:", error);
            } finally {
                setLoading(false);
            }
        };

        checkStatus();
    }, [navigate]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a7935]"></div>
            </div>
        );
    }

    const menuItems = [
        { path: '/farmer/dashboard', label: 'Overview', icon: LayoutDashboard },
        { path: '/farmer/products', label: 'My Products', icon: ShoppingBasket },
        { path: '/farmer/add-product', label: 'Add Product', icon: PackagePlus },
        { path: '/farmer/orders', label: 'Orders', icon: ShoppingBasket },
        { path: '/farmer/requests', label: 'Buyer Requests', icon: Bell },
        { path: '/farmer/ai-advisor', label: 'AI Crop Advisor', icon: Sprout },
        { path: '/farmer/transport', label: 'Transport', icon: Truck },
        { path: '/farmer/wallet', label: 'My Wallet', icon: Wallet },
        { path: '/farmer/insights', label: 'Market Insights', icon: TrendingUp },
        { path: '/farmer/support', label: 'Support', icon: LifeBuoy },
        { path: '/farmer/profile', label: 'Profile', icon: User },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1a7935] text-white transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } md:relative md:translate-x-0`}
            >
                <div className="flex items-center justify-between p-4 border-b border-[#145d29]">
                    <div 
                        className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity" 
                        onClick={() => navigate('/')}
                    >
                        <Sprout className="h-8 w-8 text-[#b0db3d]" />
                        <span className="text-2xl font-bold tracking-tight">AgroLink</span>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <nav className="mt-8 px-4 space-y-2">
                    {menuItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${location.pathname === item.path
                                ? 'bg-[#b0db3d] text-[#1a7935] font-semibold'
                                : 'text-white hover:bg-[#145d29]'
                                }`}
                        >
                            <item.icon className="h-5 w-5" />
                            <span>{item.label}</span>
                        </button>
                    ))}
                    <button
                        onClick={() => setIsChatbotOpen(true)}
                        className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-white hover:bg-[#145d29] mt-2 border border-[#145d29]"
                    >
                        <MessageCircle className="h-5 w-5 text-[#b0db3d]" />
                        <span className="text-[#b0db3d] font-semibold">AI Assistant</span>
                    </button>
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#145d29]">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-red-100 hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <LogOut className="h-5 w-5" />
                        <span>Log Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Top Header for Mobile */}
                <header className="bg-white shadow-sm md:hidden flex items-center justify-between p-4">
                    <div className="flex items-center">
                        <button onClick={() => setSidebarOpen(true)} className="text-gray-600 mr-4">
                            <Menu className="h-6 w-6" />
                        </button>
                        <span className="font-bold text-[#1a7935]">Dashboard</span>
                    </div>
                    <NotificationDropdown userId={userId} />
                </header>

                {/* Desktop Top Bar (Optional but good for notifications) */}
                <header className="hidden md:flex bg-white shadow-sm p-4 justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">
                        {menuItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <NotificationDropdown userId={userId} />
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold border border-green-200">
                            F
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
                    <Outlet />
                </main>
            </div>

            <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
        </div>
    );
}
