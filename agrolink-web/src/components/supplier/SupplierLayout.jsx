import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Store, LogOut, Menu, X, Sprout } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import NotificationDropdown from '../common/NotificationDropdown';

export default function SupplierLayout() {
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [userId, setUserId] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const checkStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login');
                return;
            }
            setUserId(user.id);

            try {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role, status')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;

                if (profile.role === 'supplier' && profile.status !== 'approved') {
                    navigate('/verification-pending');
                } else if (profile.role !== 'supplier' && profile.role !== 'admin') {
                    navigate('/');
                }
            } catch (error) {
                console.error("Error checking status:", error);
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
        return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a7935]"></div></div>;
    }

    const menuItems = [
        { path: '/supplier/dashboard', label: 'Overview', icon: LayoutDashboard },
        { path: '/supplier/products', label: 'My Products', icon: Store }
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0f2815] text-white transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div className="flex items-center space-x-2">
                        <Store className="h-8 w-8 text-[#1a7935]" />
                        <span className="text-2xl font-bold tracking-tight">Supplier</span>
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
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${location.pathname === item.path ? 'bg-[#1a7935] text-white font-semibold' : 'text-gray-300 hover:bg-gray-800'}`}
                        >
                            <item.icon className="h-5 w-5" />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
                    <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
                        <LogOut className="h-5 w-5" /><span>Log Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                <header className="bg-white shadow-sm flex items-center justify-between p-4">
                    <div className="flex items-center">
                        <button onClick={() => setSidebarOpen(true)} className="text-gray-600 mr-4 md:hidden"><Menu className="h-6 w-6" /></button>
                        <h2 className="text-xl font-bold text-gray-800">{menuItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationDropdown userId={userId} />
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold border border-green-200">S</div>
                    </div>
                </header>

                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
