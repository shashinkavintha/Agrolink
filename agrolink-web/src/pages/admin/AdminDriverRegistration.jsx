import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { Truck, Loader2, CheckCircle2, UserPlus } from 'lucide-react';

const AdminDriverRegistration = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        phone: '',
        vehicleType: 'lorry',
        vehicleModel: '',
        vehiclePlateNumber: ''
    });

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegisterDriver = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', message: '' });

        try {
            // Create a temporary Supabase client that doesn't persist the session
            // This prevents the Admin from being logged out when creating a new user
            const tempSupabase = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                    }
                }
            );

            // 1. Sign up the new user
            const { data: authData, error: authError } = await tempSupabase.auth.signUp({
                email: formData.email,
                password: formData.password,
            });

            if (authError) throw authError;

            if (authData.user) {
                // 2. Create Profile via Backend API (Auto-approved)
                const profileData = {
                    id: authData.user.id,
                    email: formData.email,
                    fullName: formData.fullName,
                    role: 'driver',
                    vehicleType: formData.vehicleType,
                    vehicleModel: formData.vehicleModel,
                    vehiclePlateNumber: formData.vehiclePlateNumber,
                    status: 'approved' // Automatically approve since Admin is registering them!
                };

                await axios.post('/api/profiles', profileData);

                setStatus({
                    type: 'success',
                    message: `Driver ${formData.fullName} successfully registered and approved! They can now log in.`
                });

                // Clear form
                setFormData({
                    email: '',
                    password: '',
                    fullName: '',
                    phone: '',
                    vehicleType: 'lorry',
                    vehicleModel: '',
                    vehiclePlateNumber: ''
                });
            } else {
                 throw new Error("Failed to create auth user.");
            }

        } catch (err) {
            console.error('Registration Error:', err);
            setStatus({ type: 'error', message: err.message || 'Failed to register driver.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-white shadow rounded-xl mt-6 border border-gray-100">
            <div className="flex items-center space-x-3 mb-8 pb-4 border-b border-gray-100">
                <div className="bg-[#e8f5e9] p-3 rounded-xl border border-[#c8e6c9]">
                    <UserPlus className="w-8 h-8 text-[#1a7935]" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Manual Driver Registration</h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Register trusted drivers directly into the system. Drivers registered here are automatically approved.
                    </p>
                </div>
            </div>

            {status.message && (
                <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 border ${status.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" /> : null}
                    <div>
                        <h4 className="font-semibold">{status.type === 'success' ? 'Success!' : 'Error'}</h4>
                        <p className="text-sm mt-1">{status.message}</p>
                    </div>
                </div>
            )}

            <form onSubmit={handleRegisterDriver} className="space-y-6">
                
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Driver Account Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                        <input
                            type="text"
                            name="fullName"
                            required
                            value={formData.fullName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a7935] focus:border-transparent outline-none transition-all"
                            placeholder="e.g. Nimal Perera"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a7935] focus:border-transparent outline-none transition-all"
                            placeholder="e.g. 0771234567"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Login Email *</label>
                        <input
                            type="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a7935] focus:border-transparent outline-none transition-all"
                            placeholder="driver@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Initial Password *</label>
                        <input
                            type="text"
                            name="password"
                            required
                            minLength={6}
                            value={formData.password}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a7935] focus:border-transparent outline-none transition-all"
                            placeholder="Select a secure password"
                        />
                        <p className="text-xs text-gray-500 mt-1">You will provide this password to the driver.</p>
                    </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 pt-4">Vehicle Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type *</label>
                        <select
                            name="vehicleType"
                            value={formData.vehicleType}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a7935] focus:border-transparent outline-none transition-all"
                        >
                            <option value="lorry">Lorry</option>
                            <option value="batta">Batta (Small Truck)</option>
                            <option value="trishaw">Three-Wheeler</option>
                            <option value="van">Van</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Model *</label>
                        <input
                            type="text"
                            name="vehicleModel"
                            required
                            value={formData.vehicleModel}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a7935] focus:border-transparent outline-none transition-all"
                            placeholder="e.g. Tata Ace, Isuzu"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">License Plate Number *</label>
                        <input
                            type="text"
                            name="vehiclePlateNumber"
                            required
                            value={formData.vehiclePlateNumber}
                            onChange={(e) => setFormData({ ...formData, vehiclePlateNumber: e.target.value.toUpperCase() })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a7935] focus:border-transparent outline-none transition-all uppercase"
                            placeholder="e.g. WP ABC-1234"
                        />
                    </div>
                </div>

                <div className="pt-6">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-14 flex items-center justify-center bg-[#1a7935] hover:bg-[#145d29] text-white rounded-xl font-bold shadow-lg shadow-green-900/20 transition-all disabled:opacity-70"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Registering Driver...
                            </>
                        ) : (
                            <>
                                <Truck className="w-5 h-5 mr-2" />
                                Register & Auto-Approve Driver
                            </>
                        )}
                    </button>
                    <p className="text-center text-xs text-gray-500 mt-4">
                        Upon successful registration, the driver will be immediately active by passing the standard verification queue. Please securely share the email and password with the driver.
                    </p>
                </div>
            </form>
        </div>
    );
};

export default AdminDriverRegistration;
