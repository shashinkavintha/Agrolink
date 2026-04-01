import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import axios from 'axios';
import { User, Truck, Sprout, ShoppingBag, Loader2, Store, CreditCard, Phone } from 'lucide-react';
import { validationRules } from '../lib/validation';

const roles = [
    { id: 'farmer', label: 'Farmer', icon: Sprout, description: 'Sell your harvest directly to buyers.' },
    { id: 'buyer', label: 'Buyer', icon: ShoppingBag, description: 'Purchase fresh produce easily.' },
    { id: 'supplier', label: 'Supplier', icon: Store, description: 'Supply essential items for Farmers.' }
];

const buyerTypes = [
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'retail_shop', label: 'Retail Shop' },
    { value: 'wholesale', label: 'Wholesale' },
    { value: 'individual', label: 'Individual' },
    { value: 'other', label: 'Other' }
];

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [selectedRole, setSelectedRole] = useState(null);
    const [buyerType, setBuyerType] = useState('');
    const [nic, setNic] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');

    // Driver Details
    const [vehicleType, setVehicleType] = useState('lorry');
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehiclePlateNumber, setVehiclePlateNumber] = useState('');

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!selectedRole) {
            setError('Please select a role.');
            return;
        }
        if (selectedRole === 'buyer' && !buyerType) {
            setError('Please select a buyer type.');
            return;
        }
        if (selectedRole === 'driver' && (!vehicleType || !vehicleModel || !vehiclePlateNumber)) {
            setError('Please fill in all vehicle details.');
            return;
        }

        // --- SRI LANKAN VALIDATION ---
        if (!validationRules.nic.test(nic)) {
            setError('Invalid NIC format. (Legacy: 9 dig + V/X, Modern: 12 dig)');
            return;
        }
        if (!validationRules.mobile.test(phoneNumber)) {
            setError('Invalid Phone Number format. (e.g., 0771234567 or +94771234567)');
            return;
        }
        // -----------------------------

        // --- PASSWORD VALIDATION ---
        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }
        if (!/(?=.*[a-z])/.test(password)) {
            setError('Password must contain at least one lowercase letter.');
            return;
        }
        if (!/(?=.*[A-Z])/.test(password)) {
            setError('Password must contain at least one uppercase letter.');
            return;
        }
        if (!/(?=.*\d)/.test(password)) {
            setError('Password must contain at least one number.');
            return;
        }
        if (!/(?=.*[@$!%*?&._-])/.test(password)) {
            setError('Password must contain at least one special character (@$!%*?&._-).');
            return;
        }
        // -----------------------------

        setLoading(true);
        setError('');
        setMessage('');

        try {
            // 1. Sign up with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;

            if (authData.user) {
                // 2. Create Profile via Backend API
                const profileData = {
                    id: authData.user.id,
                    email: email,
                    fullName: fullName,
                    role: selectedRole,
                    nic: nic,
                    phoneNumber: phoneNumber,
                    buyerType: selectedRole === 'buyer' ? buyerType : null,
                    vehicleType: selectedRole === 'driver' ? vehicleType : null,
                    vehicleModel: selectedRole === 'driver' ? vehicleModel : null,
                    vehiclePlateNumber: selectedRole === 'driver' ? vehiclePlateNumber : null,
                    status: selectedRole === 'buyer' ? 'approved' : 'pending' // Buyers auto-approved, others pending
                };

                await axios.post('/api/profiles', profileData);

                setMessage('Registration successful! Redirecting...');

                // Wait a moment then redirect
                setTimeout(() => {
                    if (selectedRole === 'buyer') {
                        // Buyers go to dashboard/home (placeholder for now)
                        window.location.href = '/';
                    } else {
                        // Farmers/Drivers go to verification
                        window.location.href = '/verification-pending';
                    }
                }, 1500);
            }
        } catch (err) {
            console.error(err);
            setError(err.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Create your account
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Join AgroLink today
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleRegister}>

                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                            <div className="mt-1">
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#1a7935] focus:border-[#1a7935] sm:text-sm"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email address</label>
                            <div className="mt-1">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#1a7935] focus:border-[#1a7935] sm:text-sm"
                                />
                            </div>
                        </div>

                        {/* NIC Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">NIC Number</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <CreditCard className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. 199512345678 or 855420159V"
                                    value={nic}
                                    onChange={(e) => setNic(e.target.value.toUpperCase())}
                                    className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-[#1a7935] focus:border-[#1a7935] sm:text-sm"
                                />
                            </div>
                        </div>

                        {/* Phone Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="tel"
                                    required
                                    placeholder="e.g. 0771234567"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-[#1a7935] focus:border-[#1a7935] sm:text-sm"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <div className="mt-1">
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#1a7935] focus:border-[#1a7935] sm:text-sm"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Must be at least 8 characters, and include an uppercase letter, a lowercase letter, a number, and a special character.
                                </p>
                            </div>
                        </div>

                        {/* Role Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Account Type</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {roles.map((role) => (
                                    <div
                                        key={role.id}
                                        onClick={() => setSelectedRole(role.id)}
                                        className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center justify-center text-center transition-all ${selectedRole === role.id
                                            ? 'border-[#1a7935] bg-[#e8f5e9] ring-1 ring-[#1a7935]'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <role.icon className={`h-6 w-6 mb-2 ${selectedRole === role.id ? 'text-[#1a7935]' : 'text-gray-500'}`} />
                                        <span className={`text-xs font-semibold ${selectedRole === role.id ? 'text-[#1a7935]' : 'text-gray-700'}`}>
                                            {role.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {selectedRole && (
                                <p className="mt-2 text-xs text-gray-500 text-center">
                                    {roles.find(r => r.id === selectedRole)?.description}
                                </p>
                            )}
                        </div>

                        {/* Buyer Type Selection */}
                        {selectedRole === 'buyer' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Buyer Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {buyerTypes.map((type) => (
                                        <div
                                            key={type.value}
                                            onClick={() => setBuyerType(type.value)}
                                            className={`cursor-pointer border rounded-lg p-3 text-center transition-all ${buyerType === type.value
                                                ? 'border-[#1a7935] bg-[#e8f5e9] text-[#1a7935]'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                                }`}
                                        >
                                            <span className="text-sm font-medium">{type.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Driver Vehicle Details */}
                        {selectedRole === 'driver' && (
                            <div className="space-y-4 pt-2 border-t border-gray-100">
                                <h3 className="text-sm font-medium text-gray-900">Vehicle Details</h3>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                                    <select
                                        value={vehicleType}
                                        onChange={(e) => setVehicleType(e.target.value)}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#1a7935] focus:border-[#1a7935] sm:text-sm"
                                    >
                                        <option value="lorry">Lorry</option>
                                        <option value="batta">Batta (Small Truck)</option>
                                        <option value="trishaw">Three-Wheeler</option>
                                        <option value="van">Van</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Model</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Tata Ace, Isuzu Elf"
                                        value={vehicleModel}
                                        onChange={(e) => setVehicleModel(e.target.value)}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#1a7935] focus:border-[#1a7935] sm:text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">License Plate Number</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="WP ABC-1234"
                                        value={vehiclePlateNumber}
                                        onChange={(e) => setVehiclePlateNumber(e.target.value.toUpperCase())}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#1a7935] focus:border-[#1a7935] sm:text-sm uppercase"
                                    />
                                </div>
                            </div>
                        )}

                        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                        {message && <div className="text-green-600 text-sm text-center">{message}</div>}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1a7935] hover:bg-[#145d29] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a7935] disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Sign Up'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
