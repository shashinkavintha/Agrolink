import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { DollarSign, ShoppingBag, Truck, TrendingUp, Loader2, CheckCircle, XCircle, Star, User, Crown, MapPin, Navigation, RefreshCw, AlertCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../../lib/supabaseClient';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const farmerIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // Farmer/Person icon
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    shadowSize: [41, 41]
});

const driverIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1048/1048329.png', // Green Delivery Truck (Lorry)
    shadowUrl: null, // No shadow for cleaner look
    iconSize: [45, 45],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22]
});

// Map Recenter Component
function MapRecenter({ center }) {
    const map = useMap();
    useEffect(() => {
        // Ensure center is valid [lat, lng]
        if (center && typeof center.lat === 'number' && typeof center.lng === 'number' && !isNaN(center.lat) && !isNaN(center.lng)) {
            map.flyTo(center, 15, { duration: 1.5 });
        }
    }, [center, map]);
    return null;
}

export default function FarmerDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [stats, setStats] = useState({
        earnings: 0,
        pending: 0,
        shipped: 0
    });
    const [reviews, setReviews] = useState([]);
    const [averageRating, setAverageRating] = useState(0);
    const [profile, setProfile] = useState(null);
    const [farmerLocation, setFarmerLocation] = useState(null);
    const [activeDriver, setActiveDriver] = useState(null);
    const [activeDriverLocation, setActiveDriverLocation] = useState(null);
    const [routeLine, setRouteLine] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);


    // Data Fetch Function (Extractd for Polling)
    const fetchData = async () => {
        // Safety check for user
        if (!user?.id) return;

        try {
            // Fetch Profile Only if missing (optimization)
            if (!profile) {
                const profileRes = await axios.get(`/api/profiles/${user.id}`);
                setProfile(profileRes.data);

                if (profileRes.data.latitude && profileRes.data.longitude) {
                    setFarmerLocation({
                        lat: parseFloat(profileRes.data.latitude),
                        lng: parseFloat(profileRes.data.longitude)
                    });
                } else {
                    // Default fallback (Sri Lanka center roughly)
                    setFarmerLocation({ lat: 7.8731, lng: 80.7718 });
                }
            }

            // Fetch Orders
            const ordersRes = await axios.get(`/api/orders?farmerId=${user.id}`);
            const ordersData = Array.isArray(ordersRes.data) ? ordersRes.data : [];
            setOrders(ordersData);

            // Check for any active order with a driver
            const incomingOrder = ordersData.find(o => o.status === 'ready_to_ship' && o.driver);
            const shippingOrder = ordersData.find(o => o.status === 'shipped' && o.driver);

            const activeOrder = incomingOrder || shippingOrder;

            // Update Active Driver Logic
            if (activeOrder && activeOrder.driver) {
                // If driver changed or wasn't set, fetch loc
                if (!activeDriver || activeDriver.id !== activeOrder.driver.id) {
                    setActiveDriver(activeOrder.driver);

                    // Initial driver location fetch using PROFILES table (Correct Source)
                    const { data: driverProfile } = await supabase
                        .from('profiles')
                        .select('latitude, longitude')
                        .eq('id', activeOrder.driver.id)
                        .maybeSingle();

                    if (driverProfile && driverProfile.latitude && driverProfile.longitude) {
                        setActiveDriverLocation({
                            lat: parseFloat(driverProfile.latitude),
                            lng: parseFloat(driverProfile.longitude)
                        });
                    }
                }
            } else {
                // If no active order, clear active driver
                if (activeDriver) {
                    setActiveDriver(null);
                    setActiveDriverLocation(null);
                }
            }

            // Calc stats
            const pendingCount = ordersData.filter(o => o.status === 'pending').length;
            const earnings = ordersData
                .filter(o => o.status === 'delivered')
                .reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

            setStats({
                earnings,
                pending: pendingCount,
                shipped: ordersData.filter(o => ['shipping', 'delivered'].includes(o.status)).length
            });

            // Fetch Reviews (Only once)
            if (reviews.length === 0) {
                const reviewsRes = await axios.get(`/api/reviews/profile/${user.id}`);
                const reviewsData = Array.isArray(reviewsRes.data) ? reviewsRes.data : [];
                setReviews(reviewsData);

                if (reviewsData.length > 0) {
                    const total = reviewsData.reduce((acc, r) => acc + (r.rating || 0), 0);
                    setAverageRating(total / reviewsData.length);
                }
            }

        } catch (error) {
            console.error("Failed to load farmer data", error);
        } finally {
            setLoading(false);
        }
    };

    // Initial Fetch & Polling
    useEffect(() => {
        fetchData();

        // Poll every 10 seconds to catch Driver Acceptance
        const interval = setInterval(() => {
            fetchData();
        }, 10000);

        return () => clearInterval(interval);
    }, [user]);

    // Live Driver Tracking (Supabase Realtime - FIXED)
    useEffect(() => {
        if (!activeDriver) return;

        const channel = supabase
            .channel(`driver-tracking-${activeDriver.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles', // Correct Table
                    filter: `id=eq.${activeDriver.id}`
                },
                (payload) => {
                    const newLoc = payload.new;
                    console.log("🚚 Realtime Driver Update:", newLoc);
                    if (newLoc.latitude && newLoc.longitude) {
                        setActiveDriverLocation({
                            lat: parseFloat(newLoc.latitude),
                            lng: parseFloat(newLoc.longitude)
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeDriver]);

    // Update Route Line (Real Road Path)
    useEffect(() => {
        if (farmerLocation && activeDriverLocation) {
            // Ensure numbers before setting route
            if (activeDriverLocation.lat && activeDriverLocation.lng) {

                const fetchRoute = async () => {
                    try {
                        // OSRM API call for driving route
                        const url = `https://router.project-osrm.org/route/v1/driving/${activeDriverLocation.lng},${activeDriverLocation.lat};${farmerLocation.lng},${farmerLocation.lat}?overview=full&geometries=geojson`;

                        const response = await fetch(url);
                        const data = await response.json();

                        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                            const coordinates = data.routes[0].geometry.coordinates;
                            // OSRM returns [lng, lat], Leaflet needs [lat, lng]
                            const path = coordinates.map(coord => [coord[1], coord[0]]);
                            setRouteLine(path);
                        } else {
                            // Fallback to straight line if no route found
                            setRouteLine([
                                [activeDriverLocation.lat, activeDriverLocation.lng],
                                [farmerLocation.lat, farmerLocation.lng]
                            ]);
                        }
                    } catch (error) {
                        console.error('Error fetching route:', error);
                        // Fallback to straight line on error
                        setRouteLine([
                            [activeDriverLocation.lat, activeDriverLocation.lng],
                            [farmerLocation.lat, farmerLocation.lng]
                        ]);
                    }
                };

                fetchRoute();
            }
        } else {
            setRouteLine(null);
        }
    }, [farmerLocation, activeDriverLocation]);


    // Handle Farmer Location Adjustment
    const handleDragEnd = async (e) => {
        const marker = e.target;
        const position = marker.getLatLng();
        setFarmerLocation(position);

        try {
            await axios.put(`/api/profiles/${user.id}`, {
                ...profile,
                latitude: position.lat,
                longitude: position.lng
            });
            alert("Location updated successfully!");
        } catch (error) {
            console.error("Failed to update location", error);
            alert("Failed to save new location.");
        }
    };

    const handleStatusUpdate = async (orderId, status) => {
        try {
            await axios.put(`/api/orders/${orderId}/status?status=${status}`);
            fetchData(); // Refresh immediately
            // Optional: aggressive reload if clear needed
            if (status === 'cancelled') window.location.reload();
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Failed to update order status");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-[#1a7935]" />
            </div>
        );
    }

    // Top Seller Metrics (Read from Backend)
    const isTopSeller = profile?.isTopSeller;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

            {/* --- LIVE TRACKING MAP SECTION --- */}
            <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-[#1a7935]" />
                            Live Farm Location & Tracking {activeDriver && activeDriverLocation && <span className="text-sm font-normal text-gray-400 ml-2"> (Order #{orders.find(o => o.driver?.id === activeDriver.id)?.id?.slice(0, 8)})</span>}
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Drag the green marker to adjust your farm location.
                            {activeDriver ? <span className="text-blue-600 font-bold ml-1 animate-pulse">● Driver is on the way!</span> : " Waiting for orders..."}
                        </p>
                    </div>
                    {activeDriver ? (
                        <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                            <p className="text-xs font-bold text-blue-700 flex items-center gap-1">
                                <Truck className="h-3 w-3" />
                                Driver Active
                            </p>
                        </div>
                    ) : (
                        <button
                            onClick={fetchData}
                            className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-50 transition-colors"
                            title="Refresh Status"
                        >
                            <RefreshCw className="h-5 w-5" />
                        </button>
                    )}
                </div>

                <div className="h-[400px] w-full relative z-0">
                    {farmerLocation && typicalNumber(farmerLocation.lat) ? (
                        <MapContainer
                            center={[farmerLocation.lat, farmerLocation.lng]}
                            zoom={13}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; OpenStreetMap contributors'
                            />

                            {/* Farmer Marker (Draggable) */}
                            <Marker
                                position={[farmerLocation.lat, farmerLocation.lng]}
                                icon={farmerIcon}
                                draggable={true}
                                eventHandlers={{
                                    dragend: handleDragEnd,
                                }}
                            >
                                <Popup>Your Farm Location (Drag to adjust)</Popup>
                            </Marker>

                            {/* Driver Marker (Live) */}
                            {activeDriverLocation && typicalNumber(activeDriverLocation.lat) && (
                                <Marker
                                    position={[activeDriverLocation.lat, activeDriverLocation.lng]}
                                    icon={driverIcon}
                                >
                                    <Popup>Driver is here</Popup>
                                </Marker>
                            )}

                            {/* Route Line */}
                            {routeLine && (
                                <Polyline positions={routeLine} color="#2563eb" weight={4} opacity={0.7} dashArray="10, 10" />
                            )}

                            <MapRecenter center={activeDriverLocation || farmerLocation} />
                        </MapContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center bg-gray-50">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    )}
                </div>
            </div>

            {/* --- REST OF DASHBOARD (STATS) --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Stats Cards... */}
                <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Total Earnings</p>
                        <h3 className="text-2xl font-black text-gray-900">Rs.{stats.earnings.toLocaleString()}</h3>
                    </div>
                    <div className="h-12 w-12 bg-green-50 rounded-2xl flex items-center justify-center text-[#1a7935]">
                        <DollarSign className="h-6 w-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Pending Orders</p>
                        <h3 className="text-2xl font-black text-gray-900">{stats.pending}</h3>
                    </div>
                    <div className="h-12 w-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
                        <ShoppingBag className="h-6 w-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Completed</p>
                        <h3 className="text-2xl font-black text-gray-900">{stats.shipped}</h3>
                    </div>
                    <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                        <CheckCircle className="h-6 w-6" />
                    </div>
                </div>

                {isTopSeller ? (
                    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-6 rounded-3xl shadow-lg border border-yellow-100 flex items-center justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-gradient-to-br from-yellow-400/20 to-transparent rounded-full blur-xl animate-pulse"></div>
                        <div className="relative z-10 w-full">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Crown className="h-6 w-6 text-yellow-500 fill-yellow-500 drop-shadow-sm" />
                                    <span className="text-sm font-black text-yellow-700 uppercase tracking-widest">Top Seller</span>
                                </div>
                                <div className="bg-yellow-200/50 text-yellow-800 text-[10px] font-black px-2 py-1 rounded-full border border-yellow-300">VERIFIED</div>
                            </div>
                            <div className="flex justify-between items-end mt-4">
                                <div>
                                    <p className="text-[10px] text-yellow-800 font-bold opacity-80 uppercase">Trust Rating</p>
                                    <p className="text-2xl font-black text-yellow-900 drop-shadow-sm">{profile?.rating ? profile.rating.toFixed(1) : "0.0"}/5.0</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-yellow-800 font-bold opacity-80 uppercase">Global Rank</p>
                                    <p className="text-2xl font-black text-yellow-900 drop-shadow-sm">{profile?.wilsonScore ? profile.wilsonScore.toFixed(3) : "0.000"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-3xl shadow-lg border border-gray-200 flex flex-col justify-between relative overflow-hidden">
                        <div className="relative z-10 w-full">
                            <div className="flex items-center gap-2 mb-3">
                                <Star className="h-5 w-5 text-gray-400" />
                                <span className="text-xs font-black text-gray-600 uppercase tracking-wider">Path to Top Seller</span>
                            </div>
                            
                            {/* Calculate Progress */}
                            {(() => {
                                let progress = 0;
                                const ws = profile?.wilsonScore || 0;
                                const odr = profile?.orderDefectRate || 0;
                                const lsr = profile?.lateShipmentRate || 0;
                                const cancel = profile?.preFulfillmentCancellationRate || 0;

                                // 1. Wilson score: >= 0.5 is 25% (progressively added)
                                if (ws >= 0.5) progress += 25;
                                else progress += (ws / 0.5) * 25;
                                
                                if (odr <= 1.0) progress += 25;
                                if (lsr <= 4.0) progress += 25;
                                if (cancel <= 2.5) progress += 25;
                                
                                progress = Math.min(100, Math.max(0, isNaN(progress) ? 0 : progress));
                                
                                return (
                                    <>
                                        <div className="flex justify-between items-end mb-1">
                                            <p className="text-[10px] font-bold text-gray-500">Progress</p>
                                            <p className="text-lg font-black text-gray-800">{progress.toFixed(0)}%</p>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden border border-gray-300">
                                            <div 
                                                className={`h-2.5 rounded-full transition-all duration-1000 ${progress >= 75 ? 'bg-[#1a7935]' : progress >= 40 ? 'bg-yellow-500' : 'bg-orange-500'}`} 
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-[9px] text-gray-400 font-medium leading-tight mt-2">
                                            Achieve a Wilson Score &gt; 0.5 and meet all SLA targets to unlock <strong className="text-yellow-600">Top Seller</strong> benefits.
                                        </p>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}
            </div>

            {/* --- MY PERFORMANCE RANKINGS --- */}
            <div className="mt-8">
                 <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-[#1a7935]" />
                    Performance Scorecard
                 </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Merchant Rank</p>
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Star className="h-4 w-4 fill-current" /></div>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900">{profile?.wilsonScore?.toFixed(3) || "0.000"}</h3>
                        <p className="text-xs text-gray-400 mt-1">Wilson Confidence Score</p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Order Defect Rate</p>
                            <div className={`p-2 rounded-lg ${profile?.orderDefectRate > 1.0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}><AlertCircle className="h-4 w-4" /></div>
                        </div>
                        <h3 className={`text-2xl font-black ${profile?.orderDefectRate > 1.0 ? 'text-red-600' : 'text-gray-900'}`}>{profile?.orderDefectRate?.toFixed(1) || "0.0"}%</h3>
                        <p className="text-xs text-gray-400 mt-1">Target: &lt; 1.0%</p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Late Ship Rate</p>
                            <div className={`p-2 rounded-lg ${profile?.lateShipmentRate > 4.0 ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}><TrendingUp className="h-4 w-4" /></div>
                        </div>
                        <h3 className={`text-2xl font-black ${profile?.lateShipmentRate > 4.0 ? 'text-orange-600' : 'text-gray-900'}`}>{profile?.lateShipmentRate?.toFixed(1) || "0.0"}%</h3>
                        <p className="text-xs text-gray-400 mt-1">Target: &lt; 4.0%</p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cancel Rate</p>
                            <div className={`p-2 rounded-lg ${profile?.preFulfillmentCancellationRate > 2.5 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}><XCircle className="h-4 w-4" /></div>
                        </div>
                        <h3 className={`text-2xl font-black ${profile?.preFulfillmentCancellationRate > 2.5 ? 'text-red-600' : 'text-gray-900'}`}>{profile?.preFulfillmentCancellationRate?.toFixed(1) || "0.0"}%</h3>
                        <p className="text-xs text-gray-400 mt-1">Target: &lt; 2.5%</p>
                    </div>
                </div>
            </div>

            {/* Client Reviews Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Customer Reputation</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={`h-5 w-5 ${star <= Math.round(averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                    />
                                ))}
                            </div>
                            <span className="font-bold text-gray-700">{averageRating.toFixed(1)} / 5.0</span>
                            <span className="text-gray-400 text-sm">({reviews.length} reviews)</span>
                        </div>
                    </div>
                </div>

                {reviews.length === 0 ? (
                    <p className="text-gray-500 italic">No reviews yet.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {reviews.slice(0, 6).map((review) => (
                            <div key={review.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`h-3 w-3 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-gray-600 text-sm italic">"{review.comment}"</p>
                                <div className="mt-3 flex items-center gap-2">
                                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs font-bold text-green-700">
                                        {review.reviewer?.email?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <span className="text-xs font-bold text-gray-500">{review.reviewer?.email?.split('@')[0] || 'Anonymous'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Orders List */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800">Recent Orders</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Items</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Driver</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">#{order.id ? order.id.toString().slice(0, 8) : '...'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <div className="max-w-[200px] truncate">
                                            {order.items?.map(i => i.product?.name || i.customItemName).join(', ')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-[#1a7935]">Rs.{order.totalAmount}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                        'bg-blue-100 text-blue-800'}`}>
                                            {order.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {order.driver ? (
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                <span>{order.driver.fullName || 'Assigned'}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 italic">No Driver</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        {(order.status === 'pending' || order.status === 'accepted') && (
                                            <div className="flex justify-end gap-2">
                                                {order.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(order.id, 'accepted')}
                                                        className="text-[#1a7935] hover:text-green-900 bg-green-50 px-3 py-1 rounded-lg"
                                                    >
                                                        Accept
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                                                    className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded-lg"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                        {/* Allow cancelling STUCK orders (ready_to_ship/shipped) */}
                                        {(order.status === 'ready_to_ship' || order.status === 'shipped') && (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm("Are you sure? This will cancel the active delivery.")) {
                                                            handleStatusUpdate(order.id, 'cancelled');
                                                        }
                                                    }}
                                                    className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded-lg text-[10px] uppercase font-bold"
                                                >
                                                    Force Cancel
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function typicalNumber(n) {
    return typeof n === 'number' && !isNaN(n);
}
