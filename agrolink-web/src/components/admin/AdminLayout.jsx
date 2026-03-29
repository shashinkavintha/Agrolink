import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    ShoppingBag,
    CheckSquare,
    ShieldAlert,
    Map,
    Settings,
    LogOut,
    Menu,
    X,
    ShieldCheck,
    BarChart3,
    Sprout,
    LifeBuoy,
    MessageCircle,
    Truck
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Chatbot from '../IT24100581/Chatbot';

export default function AdminLayout() {
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const menuItems = [
        { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/admin/register-driver', label: 'Register Driver', icon: Truck },
        { path: '/admin/verification', label: 'User Verification', icon: ShieldCheck },
        { path: '/admin/users', label: 'User Management', icon: Users },
        { path: '/admin/products', label: 'Product Review', icon: CheckSquare },
        { path: '/admin/orders', label: 'Order Management', icon: ShoppingBag },
        { path: '/admin/farmers-shop', label: 'Farmers Shop', icon: Sprout },
        { path: '/admin/kpis', label: 'Seller Performance', icon: BarChart3 },
        { path: '/admin/logistics', label: 'Live Logistics Map', icon: Map },
        { path: '/admin/support', label: 'Support Tickets', icon: LifeBuoy },
        { path: '/admin/settings', label: 'System Settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0f2815] text-white transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } md:relative md:translate-x-0`}
            >
                <div className="flex items-center justify-between p-4 border-b border-[#1a4a26]">
                    <div className="flex items-center space-x-2">
                        <ShieldAlert className="h-8 w-8 text-[#b0db3d]" />
                        <div className="flex flex-col">
                            <span className="text-xl font-bold tracking-tight">AgroLink</span>
                            <span className="text-xs text-[#b0db3d] font-medium tracking-widest uppercase">Admin Panel</span>
                        </div>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <nav className="mt-8 px-4 space-y-1">
                    {menuItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${location.pathname === item.path
                                ? 'bg-[#1a7935] text-white shadow-md'
                                : 'text-gray-300 hover:bg-[#1a4a26] hover:text-white'
                                }`}
                        >
                            <item.icon className="h-5 w-5" />
                            <span className="font-medium text-sm">{item.label}</span>
                        </button>
                    ))}
                    <button
                        onClick={() => setIsChatbotOpen(true)}
                        className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-[#b0db3d] hover:bg-[#1a4a26] hover:text-[#b0db3d] mt-2 border border-[#1a4a26]"
                    >
                        <MessageCircle className="h-5 w-5" />
                        <span className="font-medium text-sm">AI Assistant</span>
                    </button>
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#1a4a26]">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-red-300 hover:bg-red-900/20 hover:text-red-100 rounded-lg transition-colors"
                    >
                        <LogOut className="h-5 w-5" />
                        <span>Log Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Top Header for Mobile */}
                <header className="bg-white shadow-sm md:hidden flex items-center p-4 z-40">
                    <button onClick={() => setSidebarOpen(true)} className="text-gray-600">
                        <Menu className="h-6 w-6" />
                    </button>
                    <span className="ml-4 font-bold text-[#0f2815]">Admin Control</span>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
                    <Outlet />
                </main>
            </div>

            <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
        </div>
    );
}
