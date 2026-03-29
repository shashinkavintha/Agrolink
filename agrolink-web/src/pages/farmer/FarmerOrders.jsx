import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { ShoppingBag, Loader2, CheckCircle, XCircle, Truck } from 'lucide-react';

import { useGeolocation } from '../../hooks/useGeolocation';
import { useSyncFarmerLocation } from '../../hooks/useFarmerTracking';

export default function FarmerOrders() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [acceptingId, setAcceptingId] = useState(null);

    // Sync Farmer's Location to DB while on this page
    const { location: gpsLocation, error: gpsError } = useGeolocation(true);
    useSyncFarmerLocation(gpsLocation, true);

    useEffect(() => {
        const fetchOrders = async () => {
            if (user?.id) {
                try {
                    const res = await axios.get(`/api/orders?farmerId=${user.id}`);
                    setOrders(Array.isArray(res.data) ? res.data : []);

                    // Update selectedOrder if it exists to reflect new status
                    if (selectedOrder) {
                        const updated = res.data.find(o => o.id === selectedOrder.id);
                        if (updated && updated.status !== selectedOrder.status) {
                            setSelectedOrder(updated);
                        }
                    }
                } catch (error) {
                    console.error("Failed to load farmer orders", error);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchOrders(); // Initial fetch

        // Poll every 5 seconds to catch Driver Acceptance
        const interval = setInterval(fetchOrders, 5000);
        return () => clearInterval(interval);
    }, [user, selectedOrder]); // Depend on selectedOrder to update the modal view using the latest data

    const handleAcceptOrder = async (orderId) => {
        setAcceptingId(orderId);

        const confirmAccept = async (lat = null, lng = null) => {
            try {
                // Change button text to "Accepting..."
                setAcceptingId("PROCESSING_" + orderId); 
                
                let url = `/api/orders/${orderId}/farmer-accept`;
                if (lat && lng) {
                    url += `?lat=${lat}&lon=${lng}`;
                }

                await axios.put(url);
                
                // Refresh orders
                const res = await axios.get(`/api/orders?farmerId=${user.id}`);
                setOrders(res.data);

                // Update modal state
                setSelectedOrder(prev => {
                    if (prev && prev.id === orderId) {
                        return { ...prev, status: 'accepted' };
                    }
                    return prev;
                });

            } catch (error) {
                console.error("Failed to accept order", error);
                alert("Failed to accept order: " + (error.response?.data || error.message));
            } finally {
                setAcceptingId(null);
            }
        };

        // Try to get location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    confirmAccept(latitude, longitude);
                },
                (error) => {
                    console.warn("Location error:", error.message);
                    // Non-blocking approach: just use profile address
                    confirmAccept(); 
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000, // Reduced timeout
                    maximumAge: 0
                }
            );
        } else {
            confirmAccept();
        }
    };

    if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-[#1a7935]" /></div>;

    return (
        <div className="space-y-6 relative">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Your Orders</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-gray-500">Manage your incoming orders here.</p>
                        {gpsLocation ? (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 text-[#1a7935] text-xs font-bold rounded-full border border-green-200 animate-pulse">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                Broadcasting Location
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full border border-red-200">
                                {gpsError ? `GPS Error: ${gpsError}` : "Detecting Location..."}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {orders.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <ShoppingBag className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                        <p>No active orders at the moment.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-sm">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Order ID</th>
                                    <th className="px-6 py-4 font-medium">Buyer</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium">Items</th>
                                    <th className="px-6 py-4 font-medium">Total</th>
                                    <th className="px-6 py-4 font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {Array.isArray(orders) && orders.map(order => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-sm text-gray-600">#{order.id.substring(0, 8)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                                            <div>{order.buyer ? order.buyer.getFullName || order.buyer.email : 'Unknown'}</div>
                                            <div className="text-xs text-gray-400">{order.deliveryAddress}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border capitalize ${order.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                order.status === 'accepted' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {order.items?.length || 0} Items
                                        </td>
                                        <td className="px-6 py-4 font-bold text-[#1a7935]">Rs. {order.totalAmount}</td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className="text-[#1a7935] hover:underline text-sm font-bold"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Order Details</h3>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-gray-500 font-mono">#{selectedOrder.id}</p>
                                    {/* Location Status Badge in Modal */}
                                    {gpsLocation ? (
                                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-[#1a7935] text-[10px] font-bold rounded-full border border-green-200">
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                                            </span>
                                            Live
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                            GPS Error
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Buyer Info */}
                            <div className="flex gap-4 p-4 bg-green-50 rounded-xl border border-green-100">
                                <div className="bg-white p-2 rounded-full h-fit text-[#1a7935]">
                                    <Truck className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-[#1a7935] uppercase tracking-wide mb-1">Delivery To</p>
                                    <p className="font-bold text-gray-800">{selectedOrder.buyer?.getFullName || selectedOrder.buyer?.email || 'Unknown Buyer'}</p>
                                    <p className="text-sm text-gray-600">{selectedOrder.deliveryAddress}</p>
                                    <p className="text-sm text-gray-600">{selectedOrder.contactNumber}</p>
                                </div>
                            </div>

                            {/* Items List */}
                            <div>
                                <h4 className="font-bold text-gray-800 mb-4">Pack These Items:</h4>
                                <div className="space-y-3">
                                    {selectedOrder.items?.map((item, idx) => (
                                        <div key={idx} className="flex gap-4 items-center bg-white border border-gray-100 p-3 rounded-xl shadow-sm">
                                            {/* Product Img Placeholder */}
                                            <div className="h-16 w-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                                                {item.product?.imageUrl ?
                                                    <img src={item.product.imageUrl} className="w-full h-full object-cover" alt="" />
                                                    : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Img</div>
                                                }
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-800">{item.product?.name}</p>
                                                <p className="text-sm text-gray-500">Unit Price: Rs. {item.priceAtTime}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-lg text-[#1a7935]">x{item.quantity}</p>
                                                <p className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                    {item.product?.unit}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                <span className="text-gray-500">Total Order Value</span>
                                <span className="text-2xl font-bold text-[#1a7935]">Rs. {selectedOrder.totalAmount}</span>
                            </div>

                            {/* Actions */}
                            {(selectedOrder.status?.toLowerCase() === 'pending' || !selectedOrder.status) && (
                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => {
                                            handleAcceptOrder(selectedOrder.id);
                                        }}
                                        disabled={!!acceptingId}
                                        className="flex-1 bg-[#1a7935] text-white py-3 rounded-xl font-bold hover:bg-[#145d29] flex justify-center items-center gap-2 shadow-lg shadow-green-900/10 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {acceptingId?.toString().startsWith('PROCESSING_') ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin" /> Accepting...
                                            </>
                                        ) : acceptingId === selectedOrder.id ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin" /> Locating...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="h-5 w-5" /> Accept Order
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setSelectedOrder(null)}
                                        className="flex-1 bg-white text-red-500 border border-red-200 py-3 rounded-xl font-bold hover:bg-red-50"
                                    >
                                        Reject
                                    </button>
                                </div>
                            )}

                            {/* Waiting for Driver Banner (for Accepted state) - Uber Style Radar */}
                            {selectedOrder.status?.toLowerCase() === 'accepted' && (
                                <div className="mt-6 flex flex-col items-center justify-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-300 relative overflow-hidden">
                                    {/* Pulse Animation */}
                                    <div className="relative flex items-center justify-center">
                                        <div className="absolute w-40 h-40 bg-green-200 rounded-full animate-ping opacity-20"></div>
                                        <div className="absolute w-28 h-28 bg-green-300 rounded-full animate-ping opacity-40 delay-150"></div>
                                        <div className="relative w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center z-10 border-4 border-[#1a7935]">
                                            <Loader2 className="h-8 w-8 text-[#1a7935] animate-spin" />
                                        </div>
                                    </div>

                                    <div className="mt-6 text-center z-10">
                                        <h3 className="text-lg font-bold text-gray-800">Finding Nearest Driver...</h3>
                                        <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                                            We are broadcasting your pickup location to nearby logistics partners.
                                        </p>
                                    </div>

                                    {/* Mock nearby drivers count */}
                                    <div className="mt-4 flex -space-x-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] text-gray-500 font-bold">
                                                <Truck className="h-4 w-4" />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">Connecting to drivers...</p>
                                </div>
                            )}

                            {/* Track Shipment Button for Farmers */}
                            {['ready_to_ship', 'shipped', 'delivered'].includes(selectedOrder.status) && (
                                <div className="pt-4">
                                    <a
                                        href={`/track?jobId=${selectedOrder.id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 flex justify-center items-center gap-2 shadow-lg shadow-blue-900/10"
                                    >
                                        <Truck className="h-5 w-5" /> Track Live Shipment
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
