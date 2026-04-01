import React, { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { validationRules, sriLankanAdmin } from '../../lib/validation';

const Checkout = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { cart, getCartTotal, clearCart } = useCart();
    
    const [formData, setFormData] = useState({
        first_name: user?.firstName || '',
        last_name: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        address: user?.address || '',
        city: user?.city || '',
        province: '',
        zipCode: '',
        paymentMethod: 'card' // Defaults to PayHere Card
    });

    const [availableDistricts, setAvailableDistricts] = useState([]);

    const [status, setStatus] = useState({ state: 'idle', message: '' });
    const { location: gpsLocation } = useGeolocation();

    const totalAmount = getCartTotal();
    const vatAmount = totalAmount * 0.18;
    const grandTotal = totalAmount + vatAmount;

    useEffect(() => {
        if (cart.length === 0 && status.state !== 'success') {
            navigate('/cart');
        }
    }, [cart, navigate, status.state]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        if (name === 'province') {
            const provinceData = sriLankanAdmin.provinces.find(p => p.name === value);
            setAvailableDistricts(provinceData ? provinceData.districts : []);
            setFormData(prev => ({ ...prev, city: '' })); // Reset city when province changes
        }
    };

    const processCheckout = async (e) => {
        e.preventDefault();

        if (!user) {
            alert("Please login first.");
            navigate('/login');
            return;
        }

        // --- SRI LANKAN VALIDATION (DSR Section 3) ---
        if (!validationRules.mobile.test(formData.phone)) {
            setStatus({ state: 'error', message: 'Invalid Phone Number. Please use Sri Lankan format (e.g. 0771234567).' });
            return;
        }
        if (!formData.province || !formData.city || !formData.zipCode) {
            setStatus({ state: 'error', message: 'Province, District (City), and Postal Code are strictly required.' });
            return;
        }
        // ----------------------------------------------

        if (!formData.first_name || !formData.last_name || !formData.email || !formData.phone || !formData.address || !formData.city) {
            setStatus({ state: 'error', message: 'All billing fields are strictly required by PayHere.' });
            return;
        }

        try {
            setStatus({ state: 'loading', message: 'Processing Secure Authentication...' });

            const payload = {
                buyerId: user.id,
                deliveryAddress: `${formData.address}, ${formData.city}, ${formData.province}, Sri Lanka`,
                deliveryLatitude: gpsLocation?.lat,
                deliveryLongitude: gpsLocation?.lng,
                contactNumber: formData.phone,
                city: formData.city,
                province: formData.province,
                zipCode: formData.zipCode,
                paymentMethod: formData.paymentMethod,
                items: cart.map(item => ({
                    productId: item.id,
                    quantity: item.quantity
                }))
            };

            console.log("Sending Order Payload:", payload);

            // Step 1: Save to Database
            let orderId, hashStr, merchantId, formattedAmountStr;
            try {
                const response = await axios.post('/api/orders/checkout', payload);
                if (response.data && response.data.length > 0) {
                    orderId = response.data[0].id;
                } else {
                    throw new Error("InvalidCartItems");
                }
            } catch (backendError) {
                console.error("Backend Order Error:", backendError.response?.data || backendError.message);
                if (backendError.message === "InvalidCartItems") {
                    setStatus({ state: 'error', message: 'The products in your cart have been deleted from the database! Please Clear Cart and add fresh products.' });
                } else {
                    setStatus({ state: 'error', message: 'Failed to save order in database. Check console.' });
                }
                return;
            }

            setStatus({ state: 'loading', message: 'Generating Secure Payment Hash...' });

            // Step 2: Get Hash for PayHere
            try {
                const hashRes = await axios.get(`/api/payment/hash/${orderId}`);
                hashStr = hashRes.data.hash;
                merchantId = hashRes.data.merchant_id;
                formattedAmountStr = hashRes.data.amount;
            } catch (hashError) {
                console.error("Backend Hash Error:", hashError.response?.data || hashError.message);
                setStatus({ state: 'error', message: 'Failed to generate secure PayHere hash. Check Console.' });
                return;
            }

            // Step 3: Trigger PayHere JS
            const itemsNames = cart.map(item => item.name).join(", ");
            
            const paymentDetails = {
                "sandbox": true,
                "merchant_id": merchantId, 
                "return_url": "http://localhost:5173/my-orders?payment_success_order=" + orderId,
                "cancel_url": "http://localhost:5173/checkout",
                "notify_url": "http://localhost:8080/api/payment/notify",
                "order_id": orderId,
                "items": itemsNames.length > 0 ? itemsNames : "Agrolink Products",
                "amount": formattedAmountStr || grandTotal.toString(),
                "currency": "LKR",
                "hash": hashStr,
                "first_name": formData.first_name,
                "last_name": formData.last_name,
                "email": formData.email,
                "phone": formData.phone,
                "address": formData.address,
                "city": formData.city,
                "country": "Sri Lanka"
            };

            console.log("Launching PayHere with payload:", paymentDetails);

            if (!window.payhere) {
                setStatus({ state: 'error', message: 'PayHere script is missing!' });
                return;
            }

            window.payhere.onCompleted = async function onCompleted(returnedOrderId) {
                console.log("PAYHERE SUCCESS:", returnedOrderId);
                
                // --- MOCK WEBHOOK FOR LOCALHOST SANDBOX ---
                // PayHere sandbox cannot reach localhost:8080 directly.
                try {
                    await axios.post('/api/payment/notify', null, {
                        params: {
                            merchant_id: paymentDetails.merchant_id,
                            order_id: orderId,
                            payhere_amount: paymentDetails.amount,
                            payhere_currency: paymentDetails.currency,
                            status_code: "2",
                            md5sig: "mock" // Match the backend bypass for local testing
                        }
                    });
                } catch (err) {
                    console.error("Mock webhook failed", err);
                }
                // ------------------------------------------

                clearCart();
                setStatus({ state: 'success', message: 'Payment Successful!' });
                window.location.href = '/my-orders';
            };

            window.payhere.onDismissed = function onDismissed() {
                console.log("PAYHERE DISMISSED BY USER OR VALIDATION.");
                setStatus({ state: 'error', message: 'Payment gateway popup was closed or validation failed. Please check console logs.' });
            };

            window.payhere.onError = function onError(errorMsg) {
                console.error("PAYHERE ERROR:", errorMsg);
                setStatus({ state: 'error', message: `PayHere Error: ${errorMsg}` });
            };

            setStatus({ state: 'idle', message: '' }); 
            window.payhere.startPayment(paymentDetails);

        } catch (error) {
            console.error("Unexpected checkout crash:", error);
            setStatus({ state: 'error', message: 'Something went wrong processing your checkout.' });
        }
    };

    if (cart.length === 0 && status.state !== 'success') return null;

    return (
        <div className="min-h-screen bg-white">
            <div className="bg-gray-50 border-b border-gray-200 pt-24 pb-12">
                <div className="container mx-auto px-4 max-w-5xl">
                    <button onClick={() => navigate('/cart')} className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Cart
                    </button>
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <ShoppingBag className="w-8 h-8 text-[#1a7935]" />
                        Secure Checkout
                    </h1>
                    <p className="text-gray-500 mt-2 text-lg">Complete your order with PayHere.</p>
                </div>
            </div>

            <div className="container mx-auto px-4 max-w-5xl py-12">
                
                {status.state === 'error' && (
                    <div className="mb-8 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold">Checkout Error</h4>
                            <p className="text-sm mt-1">{status.message}</p>
                            <p className="text-xs mt-2 font-mono bg-red-100 p-2 rounded text-red-800">Please check the right-click Browser Inspect &rarr; Console for exactly what went wrong.</p>
                        </div>
                    </div>
                )}

                <div className="flex flex-col lg:flex-row gap-12">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">Billing Information</h2>
                        
                        <form id="checkout-form" onSubmit={processCheckout} className="space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">First Name *</label>
                                    <input required type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1a7935] focus:border-transparent transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Last Name *</label>
                                    <input required type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1a7935] focus:border-transparent transition-all" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address *</label>
                                <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1a7935] focus:border-transparent transition-all" />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number *</label>
                                <input required type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1a7935] focus:border-transparent transition-all" />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Street Address *</label>
                                <input required type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1a7935] focus:border-transparent transition-all" />
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Province *</label>
                                    <select required name="province" value={formData.province} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#1a7935] outline-none">
                                        <option value="">Select Province</option>
                                        {sriLankanAdmin.provinces.map(p => (
                                            <option key={p.code} value={p.name}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">District / City *</label>
                                    <select required name="city" value={formData.city} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#1a7935] outline-none" disabled={!formData.province}>
                                        <option value="">Select District</option>
                                        {availableDistricts.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Zip / Postal Code *</label>
                                    <input required type="text" name="zipCode" placeholder="e.g. 00100" value={formData.zipCode} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#1a7935] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Country</label>
                                    <input readOnly type="text" value="Sri Lanka" className="w-full bg-gray-100 border border-gray-200 text-gray-500 rounded-lg px-4 py-3 cursor-not-allowed" />
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="lg:w-[400px]">
                        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 sticky top-24 shadow-sm">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-4">Order Summary</h3>
                            
                            <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                                {cart.map(item => (
                                    <div key={item.id} className="flex justify-between items-start text-sm">
                                        <div className="pr-4">
                                            <p className="font-medium text-gray-900">{item.name}</p>
                                            <p className="text-gray-500">Qty: {item.quantity}</p>
                                        </div>
                                        <p className="font-bold text-gray-900 whitespace-nowrap">Rs. {item.price * item.quantity}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-4 border-t border-gray-200 space-y-3 mb-8">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>Rs. {totalAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>VAT (18%)</span>
                                    <span>Rs. {vatAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Delivery</span>
                                    <span className="text-green-600 font-medium">FREE</span>
                                </div>
                                <div className="flex justify-between font-bold text-2xl text-gray-900 pt-2 border-t border-gray-200">
                                    <span>Total</span>
                                    <span>Rs. {grandTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                form="checkout-form"
                                disabled={status.state === 'loading' || status.state === 'success'}
                                className="w-full h-14 bg-[#1a7935] hover:bg-[#145d29] disabled:bg-[#1a7935]/70 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(26,121,53,0.3)] disabled:shadow-none"
                            >
                                {status.state === 'loading' ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin text-white/70" />
                                        <span>{status.message}</span>
                                    </>
                                ) : (
                                    <>
                                        Pay Rs. {grandTotal.toFixed(2)}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
