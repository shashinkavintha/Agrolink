import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Package, Truck, CheckCircle, Clock, MapPin, XCircle } from 'lucide-react';
import ReviewModal from '../../components/common/ReviewModal';

const MyOrders = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        if (user) {
            console.log("Fetching orders for user:", user.id);
            axios.get(`/api/orders?buyerId=${user.id}`)
                .then(res => {
                    console.log("Orders response:", res.data);
                    setOrders(Array.isArray(res.data) ? res.data : []);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to fetch orders", err);
                    setLoading(false);
                });
        } else {
            console.log("User not logged in yet");
        }
    }, [user]);

    // Intercept PayHere Mock Webhook Redirection
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const successOrderId = queryParams.get('payment_success_order');
        if (successOrderId) {
            console.log("Interceptor: Recovering Mock Webhook for Order: " + successOrderId);
            axios.post(`/api/payment/notify`, null, {
                params: {
                    merchant_id: "sandbox",
                    order_id: successOrderId,
                    status_code: "2",
                    md5sig: "mock"
                }
            }).then(() => {
                console.log("Escrow HELD successfully via redirection interceptor.");
                // Reload orders to reflect accepted status
                if (user) {
                    axios.get(`/api/orders?buyerId=${user.id}`).then(res => setOrders(Array.isArray(res.data) ? res.data : []));
                }
            }).catch(e => console.error("Interceptor webhook failed:", e))
            .finally(() => {
                // Clean URL so it doesn't fire again on manual refresh
                window.history.replaceState({}, document.title, window.location.pathname);
            });
        }
    }, [user]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'accepted': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'ready_to_ship': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'shipped': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
            case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <Clock className="h-4 w-4" />;
            case 'accepted': return <CheckCircle className="h-4 w-4" />;
            case 'ready_to_ship': return <Package className="h-4 w-4" />;
            case 'shipped': return <Truck className="h-4 w-4" />;
            case 'delivered': return <CheckCircle className="h-4 w-4" />;
            case 'cancelled': return <XCircle className="h-4 w-4" />;
            default: return <Clock className="h-4 w-4" />;
        }
    };

    const [reviewConfig, setReviewConfig] = useState(null);

    const openReviewModal = (orderId, revieweeId, productId, name) => {
        setReviewConfig({
            orderId,
            revieweeId,
            productId,
            revieweeName: name,
            reviewerId: user.id
        });
    };

    const closeReviewModal = () => {
        setReviewConfig(null);
    };

    const handleReviewSuccess = () => {
        // Optionally refresh orders or show success message
        closeReviewModal();
    };

    if (loading) return (
        <div className="min-h-screen flex justify-center items-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#1a7935]"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-20 px-4">
            <div className="container mx-auto max-w-5xl">
                <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                    <Package className="h-8 w-8 text-[#1a7935]" />
                    My Orders
                </h1>

                {orders.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl shadow-sm text-center border border-gray-100">
                        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-500">No orders yet</h3>
                        <p className="text-gray-400 mt-2">Start shopping to see your orders here.</p>
                        <a href="/" className="inline-block mt-6 px-6 py-2 bg-[#1a7935] text-white rounded-lg font-bold hover:bg-[#145d29] transition-colors">
                            Go to Marketplace
                        </a>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Array.isArray(orders) && orders.map(order => (
                            <div
                                key={order.id}
                                onClick={() => setSelectedOrder(order)}
                                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer relative group"
                            >
                                <div className="absolute top-4 right-4 text-gray-400 group-hover:text-[#1a7935]">
                                    <span className="text-xs font-bold mr-2">View Details</span>
                                </div>

                                <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4 border-b border-gray-50 pb-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Order ID: <span className="font-mono font-medium text-gray-700">#{order.id?.substring(0, 8)}</span></p>
                                        <p className="text-xs text-gray-400 mt-1">{order.createdAt && new Date(order.createdAt).toLocaleDateString()} at {order.createdAt && new Date(order.createdAt).toLocaleTimeString()}</p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 w-fit ${getStatusColor(order.status)}`}>
                                        {getStatusIcon(order.status)}
                                        <span className="capitalize">{order.status?.replace('_', ' ')}</span>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-6">
                                    {order.items?.slice(0, 2).map(item => ( // Show only first 2 items in preview
                                        <div key={item.id} className="flex gap-4 items-center bg-gray-50 p-3 rounded-xl">
                                            <div className="h-16 w-16 bg-white rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                                                {item.product?.imageUrl ? (
                                                    <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <Package className="h-6 w-6" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-gray-800">{item.product?.name || item.customItemName || 'Custom Item'}</h4>
                                                <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-gray-800">Rs. {item.priceAtTime * item.quantity}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {order.items?.length > 2 && (
                                        <p className="text-center text-xs text-gray-400 font-medium">+{order.items.length - 2} more items</p>
                                    )}

                                    {/* Waiting for Driver Preview */}
                                    {order.status === 'accepted' && (
                                        <div className="flex justify-end pt-2">
                                            <div className="flex items-center gap-2 bg-gray-100 text-gray-500 px-3 py-1 rounded-lg text-xs font-medium border border-gray-200">
                                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                                                Waiting for Driver...
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                                        <MapPin className="h-4 w-4 text-gray-400" />
                                        {order.deliveryAddress || 'No address provided'}
                                    </div>
                                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                        <span className="text-gray-500 font-medium">Total:</span>
                                        <span className="text-xl font-bold text-[#1a7935]">Rs. {order.totalAmount}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedOrder(null)}>
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
                                <p className="text-sm text-gray-500 font-mono">#{selectedOrder.id}</p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-8">
                            {/* Timeline */}
                            <div className="relative">
                                <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-100 -translate-y-1/2 z-0"></div>
                                <div className={`absolute left-0 top-1/2 h-1 bg-green-500 -translate-y-1/2 z-0 transition-all duration-1000`}
                                    style={{
                                        width: ['pending', 'accepted', 'ready_to_ship', 'shipped', 'delivered'].indexOf(selectedOrder.status) * 25 + '%'
                                    }}
                                ></div>
                                <div className="relative z-10 flex justify-between">
                                    {['Placed', 'Accepted', 'Driver', 'Shipped', 'Delivered'].map((step, idx) => {
                                        const currentStepIdx = ['pending', 'accepted', 'ready_to_ship', 'shipped', 'delivered'].indexOf(selectedOrder.status);
                                        const isActive = idx <= currentStepIdx;
                                        return (
                                            <div key={step} className="flex flex-col items-center gap-2">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white ${isActive ? 'border-green-500 text-green-600' : 'border-gray-200 text-gray-300'}`}>
                                                    {isActive ? <CheckCircle className="h-4 w-4" /> : <div className="w-2 h-2 bg-gray-200 rounded-full"></div>}
                                                </div>
                                                <span className={`text-xs font-bold ${isActive ? 'text-green-700' : 'text-gray-300'}`}>{step}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Driver Info Section */}
                            {['ready_to_ship', 'shipped', 'delivered'].includes(selectedOrder.status) && (
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                            <Truck className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">Logistics Partner</p>
                                            <p className="font-bold text-gray-800">{selectedOrder.driver?.fullName || 'Assigned Driver'}</p>
                                            <p className="text-sm text-gray-600">Vehicle: {selectedOrder.driver?.vehicleNumber || 'Standard Delivery'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {selectedOrder.status === 'delivered' && (
                                            <button
                                                onClick={() => openReviewModal(selectedOrder.id, selectedOrder.driver?.id, null, selectedOrder.driver?.fullName || 'Driver')}
                                                className="bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-50 shadow-sm transition-colors"
                                            >
                                                Review Driver
                                            </button>
                                        )}
                                        {selectedOrder.status !== 'delivered' && (
                                            <a
                                                href={`/track?jobId=${selectedOrder.id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 flex items-center gap-2"
                                            >
                                                <MapPin className="h-4 w-4" /> Track Live
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Waiting for Driver Banner */}
                            {selectedOrder.status === 'accepted' && (
                                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex items-center gap-4">
                                    <div className="animate-pulse bg-yellow-400 w-3 h-3 rounded-full"></div>
                                    <div>
                                        <p className="font-bold text-yellow-800">Waiting for Driver</p>
                                        <p className="text-sm text-yellow-600">Your order is ready! Searching for nearby drivers...</p>
                                    </div>
                                </div>
                            )}

                            {/* Seller Info (For Review) */}
                            {(selectedOrder.status === 'delivered' || selectedOrder.status === 'shipped') && selectedOrder.farmer && (
                                <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                            <Package className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-green-600 uppercase tracking-wide">Seller</p>
                                            <p className="font-bold text-gray-800">{selectedOrder.farmer.fullName || 'Farmer'}</p>
                                            <p className="text-sm text-gray-600">From Agrolink Network</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => openReviewModal(selectedOrder.id, selectedOrder.farmer?.id, null, selectedOrder.farmer?.fullName || 'Farmer')}
                                        className="bg-white text-green-600 border border-green-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-50 shadow-sm transition-colors"
                                    >
                                        Review Seller
                                    </button>
                                </div>
                            )}

                            {/* Items List */}
                            <div>
                                <h3 className="font-bold text-gray-800 mb-4">Ordered Items</h3>
                                <div className="space-y-3">
                                    {selectedOrder.items?.map(item => (
                                        <div key={item.id} className="flex gap-4 items-center bg-white border border-gray-100 p-3 rounded-xl shadow-sm">
                                            <div className="h-16 w-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                                {item.product?.imageUrl ?
                                                    <img src={item.product.imageUrl} className="w-full h-full object-cover" />
                                                    : <div className="flex h-full items-center justify-center text-gray-300"><Package /></div>
                                                }
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-gray-800">{item.product?.name || item.customItemName || 'Custom Item'}</h4>
                                                <p className="text-sm text-gray-500">Unit Price: Rs. {item.priceAtTime}</p>
                                                {selectedOrder.status === 'delivered' && item.product && (
                                                    <button
                                                        onClick={() => openReviewModal(selectedOrder.id, null, item.product.id, item.product.name)}
                                                        className="mt-2 bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-1 rounded-lg text-xs font-bold hover:bg-yellow-100 transition-colors flex items-center gap-1 w-fit"
                                                    >
                                                        Review Product
                                                    </button>
                                                )}
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

                            {/* Payment Summary */}
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>Subtotal</span>
                                    <span>Rs. {selectedOrder.totalAmount}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>Delivery Fee</span>
                                    <span>Rs. 0.00 (Free)</span>
                                </div>
                                <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-lg text-gray-800">
                                    <span>Total Paid</span>
                                    <span className="text-[#1a7935]">Rs. {selectedOrder.totalAmount}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {reviewConfig && (
                <ReviewModal
                    isOpen={!!reviewConfig}
                    onClose={closeReviewModal}
                    revieweeName={reviewConfig.revieweeName}
                    orderId={reviewConfig.orderId}
                    revieweeId={reviewConfig.revieweeId}
                    productId={reviewConfig.productId}
                    reviewerId={reviewConfig.reviewerId}
                    onReviewSuccess={handleReviewSuccess}
                />
            )}
        </div>
    );
};

export default MyOrders;
