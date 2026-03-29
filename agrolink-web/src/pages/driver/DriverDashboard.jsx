import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useLiveLocation } from '../../hooks/useLiveLocation';
import { useTrackFarmer } from '../../hooks/useFarmerTracking'; // Add live farmer tracking
import { supabase } from '../../lib/supabaseClient';

// Fix for default marker icons in React-Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { connectWebSocket, sendLocation, disconnectWebSocket } from '../../services/websocketService';
import { Lock, Globe, Terminal, RefreshCw, AlertTriangle, Navigation, Star, User, X, Truck, MapPin, Package, Clock } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

// Helper to calculate distance in KM
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

export default function DriverDashboard() {
    const [loads, setLoads] = useState([]);
    const [selectedLoad, setSelectedLoad] = useState(null);
    const [acceptingId, setAcceptingId] = useState(null); // Fast feedback loading state
    const [driverLocation, setDriverLocation] = useState(null);
    const [activeRoute, setActiveRoute] = useState(null); // { from: {lat, lng}, to: {lat, lng} }
    const [routePath, setRoutePath] = useState(null); // Array of [lat, lng] coordinates for the actual road path

    // Delivery State
    const [currentJob, setCurrentJob] = useState(null); // The active job object
    const [jobStatus, setJobStatus] = useState(null); // 'accepted', 'ready_to_ship', 'shipped', 'delivered'

    // Geofencing State
    const [isNearPickup, setIsNearPickup] = useState(false);
    const [isNearDropoff, setIsNearDropoff] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const GEOFENCE_RADIUS_KM = 0.2; // 200 meters

    // Use live location hook
    // Use live location hook
    const { location: liveLocation, status: liveStatus, error: gpsError, isOnline, toggleOnline, isSimulating, updateDatabase } = useLiveLocation(true);
    const [shouldFollowDriver, setShouldFollowDriver] = useState(true);
    const [lastRouteUpdateLoc, setLastRouteUpdateLoc] = useState(null);
    const [isManualCorrection, setIsManualCorrection] = useState(false);
    const driverLocationLoaded = React.useRef(false);

    // Track farmer live if job is active and we are in pickup phase
    const { farmerLocation: liveFarmerLoc } = useTrackFarmer(
        (jobStatus === 'ready_to_ship' && currentJob?.farmer_id) ? currentJob.farmer_id : null
    );

    // Initial WS Connection
    useEffect(() => {
        // Connect to WebSocket when dashboard mounts
        connectWebSocket(
            () => console.log("Driver Dashboard Connected to WS 🟢"),
            (err) => console.error("WS Connection Failed 🔴", err)
        );

        return () => {
            disconnectWebSocket();
        };
    }, []);

    useEffect(() => {
        if (liveLocation && !isManualCorrection) {
            // Live GPS always wins over saved/search coordinates
            setDriverLocation(liveLocation);

            // Update route 'from' point if we have an active job and move significantly (>50m)
            if (activeRoute && (!lastRouteUpdateLoc || calculateDistance(liveLocation.lat, liveLocation.lng, lastRouteUpdateLoc.lat, lastRouteUpdateLoc.lng) > 0.05)) {
                setActiveRoute(prev => ({
                    ...prev,
                    from: { lat: liveLocation.lat, lng: liveLocation.lng }
                }));
                setLastRouteUpdateLoc(liveLocation);
            }

            // Get current user ID from Supabase session to send with location
            supabase.auth.getUser().then(({ data: { user } }) => {
                if (user && liveLocation.accuracy < 100) { // Only broadcast good location
                    sendLocation(user.id, liveLocation.lat, liveLocation.lng, liveLocation.heading || 0);
                }
            });
        }
    }, [liveLocation, activeRoute]);

    // Geofencing Check
    const [pickupDistance, setPickupDistance] = useState(null);
    const [dropoffDistance, setDropoffDistance] = useState(null);

    useEffect(() => {
        if (!driverLocation || !currentJob) {
            setIsNearPickup(false);
            setIsNearDropoff(false);
            setPickupDistance(null);
            setDropoffDistance(null);
            return;
        }

        // Check Pickup Proximity
        if (currentJob.pickup_lat && currentJob.pickup_lng) {
            const dist = calculateDistance(
                driverLocation.lat, driverLocation.lng,
                currentJob.pickup_lat, currentJob.pickup_lng
            );
            setPickupDistance(dist);
            setIsNearPickup(dist <= GEOFENCE_RADIUS_KM);
        }

        // Check Delivery Proximity
        if (currentJob.delivery_lat && currentJob.delivery_lng) {
            const dist = calculateDistance(
                driverLocation.lat, driverLocation.lng,
                currentJob.delivery_lat, currentJob.delivery_lng
            );
            setDropoffDistance(dist);
            setIsNearDropoff(dist <= GEOFENCE_RADIUS_KM);
        }

    }, [driverLocation, currentJob]);

    // Fetch available jobs (Nearby) & My Ongoing Job
    const fetchAllJobs = async (lat, lng) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) return;

            // 1. Fetch available jobs (Nearby)
            const nearbyRes = await fetch(`/api/orders/nearby?lat=${lat}&lon=${lng}`);
            if (nearbyRes.ok) {
                const nearbyOrders = await nearbyRes.json();
                const mappedLoads = nearbyOrders.map(o => {
                    let px = o.pickupLatitude || (o.farmer ? o.farmer.latitude : null);
                    let py = o.pickupLongitude || (o.farmer ? o.farmer.longitude : null);
                    let dx = o.deliveryLatitude || (o.buyer ? o.buyer.latitude : null);
                    let dy = o.deliveryLongitude || (o.buyer ? o.buyer.longitude : null);
                    
                    let dist = 0;
                    if (px && py && dx && dy) {
                        dist = calculateDistance(px, py, dx, dy);
                    }
                    
                    const hireFee = dist > 0 ? Math.round(250 + (dist * 120)) : 450;

                    return {
                        id: o.id,
                        description: o.items ? o.items.map(i => `${i.quantity || 1}x ${i.product ? i.product.name : i.customItemName}`).join(', ') : 'Packages',
                        price: o.totalAmount, // Goods cost
                        hireFee: hireFee,
                        distance: dist > 0 ? dist.toFixed(1) + ' km' : 'Distance N/A',
                        pickup_address: o.pickupAddress || (px ? `Lat: ${px.toFixed(4)}, Lng: ${py.toFixed(4)}` : 'Farm Location'),
                        dropoff_address: o.deliveryAddress || 'Customer Location',
                        pickup_lat: px,
                        pickup_lng: py,
                        delivery_lat: dx,
                        delivery_lng: dy,
                        status: o.status,
                        farmer_id: o.farmer ? o.farmer.id : null
                    };
                });
                setLoads(mappedLoads);
            }

            // 2. Fetch My Active Job
            const myRes = await fetch(`/api/orders?driverId=${user.id}`);
            if (myRes.ok) {
                const myOrders = await myRes.json();
                // Find unfinished job
                const active = myOrders.find(o => ['ready_to_ship', 'shipped'].includes(o.status));

                if (active) {
                    console.log("🚦 Active Job Found:", active);

                    // Prevent over-writing if we JUST cancelled it locally and backend is lagging slightly
                    if (currentJob && currentJob.id === active.id && jobStatus === 'cancelled') {
                        return;
                    }

                    const mappedActive = {
                        id: active.id,
                        description: active.items ? active.items.map(i => i.product ? i.product.name : (i.customItemName || 'Item')).join(', ') : 'Delivery',
                        price: active.totalAmount,
                        pickup_address: active.pickupAddress || (active.pickupLatitude ? `Lat: ${active.pickupLatitude.toFixed(4)}, Lng: ${active.pickupLongitude.toFixed(4)}` : 'Farm Location'),
                        dropoff_address: active.deliveryAddress,
                        pickup_lat: active.pickupLatitude || (active.farmer ? active.farmer.latitude : null),
                        pickup_lng: active.pickupLongitude || (active.farmer ? active.farmer.longitude : null),
                        delivery_lat: active.deliveryLatitude || (active.buyer ? active.buyer.latitude : null),
                        delivery_lng: active.deliveryLongitude || (active.buyer ? active.buyer.longitude : null),
                        status: active.status,
                        farmer_id: active.farmer ? active.farmer.id : null
                    };

                    // Only update if it's different to avoid re-renders
                    if (!currentJob || currentJob.id !== mappedActive.id) {
                        setCurrentJob(mappedActive);
                        setJobStatus(active.status);

                        // Set route to destination based on status
                        if (lat && lng) {
                            if (active.status === 'ready_to_ship') {
                                setActiveRoute({ from: { lat, lng }, to: { lat: mappedActive.pickup_lat, lng: mappedActive.pickup_lng } });
                            } else if (active.status === 'shipped') {
                                setActiveRoute({ from: { lat, lng }, to: { lat: mappedActive.delivery_lat, lng: mappedActive.delivery_lng } });
                            }
                        }
                    }
                } else {
                    // No active job found on server
                    if (currentJob) {
                        // We had one locally, but server says none. Clear it.
                        setCurrentJob(null);
                        setJobStatus(null);
                        setActiveRoute(null);
                        setRoutePath(null);
                    }
                }
            }
        } catch (e) {
            console.error("Fetch jobs error:", e);
        }
    };

    // Trigger fetch on location update (with throttling or once-stable)
    const lastFetchRef = useRef(0);
    useEffect(() => {
        if (liveLocation && Date.now() - lastFetchRef.current > 10000) { // Check every 10s
            fetchAllJobs(liveLocation.lat, liveLocation.lng);
            lastFetchRef.current = Date.now();
        }
    }, [liveLocation]);

    // Initial load ensure we fetch even if GPS delays
    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (user) fetchAllJobs(0, 0); // Try fetch active job even without loc
        };
        init();
    }, []);

    // New states for reviews
    const [reviews, setReviews] = useState([]);
    const [averageRating, setAverageRating] = useState(0);
    const [showReviews, setShowReviews] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch Driver Profile (Rating/Reviews) and Initial Jobs
    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) return;

            // 1. Last Known Location fallback if GPS isn't ready
            if (!driverLocationLoaded.current) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('latitude, longitude')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profile?.latitude && profile?.longitude) {
                    const savedLoc = { lat: profile.latitude, lng: profile.longitude, isSaved: true };
                    setDriverLocation(savedLoc);
                    fetchAllJobs(profile.latitude, profile.longitude);
                }
                driverLocationLoaded.current = true;

                // 2. Fetch Reviews/Rating
                try {
                    const res = await fetch(`/api/reviews/profile/${user.id}`);
                    if (res.ok) {
                        const data = await res.json();
                        setReviews(data);
                        if (data.length > 0) {
                            const total = data.reduce((acc, r) => acc + r.rating, 0);
                            setAverageRating(total / data.length);
                        }
                    }
                } catch (e) { }
            }
        };

        fetchInitialData();
    }, []);
    // Run ONCE on mount

    // Check for active job logic
    // We need to know if the driver already has an active job. 
    // Since we don't have a dedicated API for "my active job", we rely on local state or fetch checks.
    // For now, let's assume if we accept a load, we lock into it.


    // Handle search form submission
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)},Sri Lanka`);
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                setDriverLocation({ lat: parseFloat(lat), lng: parseFloat(lon) });
            } else {
                alert("Location not found");
            }
        } catch (err) {
            console.error("Search failed:", err);
            alert("Search failed. Please try again.");
        }
    };

    // Handle accepting a load
    const handleAcceptLoad = async (load) => {
        try {
            setAcceptingId(load.id);
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) {
                alert("Please login first");
                setAcceptingId(null);
                return;
            }

            const response = await fetch(`/api/orders/${load.id}/driver-accept?driverId=${user.id}`, {
                method: 'PUT'
            });

            if (response.ok) {
                const updatedOrder = await response.json();

                // Map the backend order object to our local load format
                // Use profile lat/lng as fallback if order pickup coords are missing
                const mappedJob = {
                    id: updatedOrder.id,
                    description: updatedOrder.items ? updatedOrder.items.map(i => i.product ? i.product.name : i.customItemName).join(', ') : 'Delivery',
                    price: updatedOrder.totalAmount,
                    pickup_address: updatedOrder.pickupAddress || (updatedOrder.pickupLatitude ? `Lat: ${updatedOrder.pickupLatitude.toFixed(4)}, Lng: ${updatedOrder.pickupLongitude.toFixed(4)}` : 'Farm Location'),
                    dropoff_address: updatedOrder.deliveryAddress,
                    pickup_lat: updatedOrder.pickupLatitude || (updatedOrder.farmer ? updatedOrder.farmer.latitude : null),
                    pickup_lng: updatedOrder.pickupLongitude || (updatedOrder.farmer ? updatedOrder.farmer.longitude : null),
                    delivery_lat: updatedOrder.deliveryLatitude || (updatedOrder.buyer ? updatedOrder.buyer.latitude : null),
                    delivery_lng: updatedOrder.deliveryLongitude || (updatedOrder.buyer ? updatedOrder.buyer.longitude : null),
                    status: updatedOrder.status,
                    farmer_id: updatedOrder.farmer ? updatedOrder.farmer.id : null
                };

                setCurrentJob(mappedJob);
                setJobStatus('ready_to_ship'); // Driver assigned

                // Set navigation to Farmer (Pickup)
                if (driverLocation && mappedJob.pickup_lat && mappedJob.pickup_lng) {
                    setActiveRoute({
                        from: { lat: driverLocation.lat, lng: driverLocation.lng },
                        to: { lat: mappedJob.pickup_lat, lng: mappedJob.pickup_lng }
                    });
                }
                alert("Job Accepted! Navigate to Pickup.");
            } else {
                alert("Failed to accept job. It might remain taken.");
            }
        } catch (e) {
            console.error("Accept error:", e);
            alert("Error accepting job");
        } finally {
            setAcceptingId(null);
        }
    };

    // Handle Confirm Pickup
    const handleConfirmPickup = async () => {
        if (!currentJob) return;
        try {
            // Status: shipped (Picked Up / In Transit)
            const response = await fetch(`/api/orders/${currentJob.id}/status?status=shipped`, {
                method: 'PUT'
            });

            if (response.ok) {
                setJobStatus('shipped');

                // Set navigation to Buyer (Dropoff)
                if (currentJob.delivery_lat && currentJob.delivery_lng) {
                    // Start from current location (which should be farmer location now)
                    setActiveRoute({
                        from: { lat: driverLocation.lat, lng: driverLocation.lng },
                        to: { lat: currentJob.delivery_lat, lng: currentJob.delivery_lng }
                    });
                } else {
                    // If no delivery coords, clear route or alert
                    setActiveRoute(null);
                    alert("No delivery coordinates found. Please check address.");
                }
                alert("Pickup Confirmed! Navigate to Buyer.");
            } else {
                alert("Failed to update status.");
            }
        } catch (e) {
            console.error("Pickup error:", e);
        }
    };

    // IP Fallback strictly disabled as per 100% accuracy requirement
    const getIpLocation = async () => {
        console.warn("🚫 IP Location disabled. Waiting for hardware GPS fix...");
        if (status !== 'error') {
            setStatus('error');
            setError("100% Accuracy Required: Waiting for GPS signal...");
        }
    };
    // Handle Confirm Delivery
    const handleConfirmDelivery = async () => {
        if (!currentJob) return;
        try {
            const response = await fetch(`/api/orders/${currentJob.id}/status?status=delivered`, {
                method: 'PUT'
            });

            if (response.ok) {
                setJobStatus('delivered');
                setActiveRoute(null); // Clear route
                alert("Delivery Confirmed! Great Job.");

                // Reset state after a short delay
                setTimeout(() => {
                    setCurrentJob(null);
                    setJobStatus(null);
                    setRoutePath(null);
                }, 2000);
            } else {
                alert("Failed to confirm delivery.");
            }
        } catch (e) {
            console.error("Delivery error:", e);
        }
    };

    // Handle Cancel Job (Manual override for stuck orders)
    const [isCancelling, setIsCancelling] = useState(false);
    const handleCancelJob = async () => {
        if (!confirm("Are you sure you want to cancel ALL active jobs? This will clear your dashboard.")) return;

        setIsCancelling(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) return;

            // 1. Fetch all jobs for this driver
            const res = await fetch(`/api/orders?driverId=${user.id}`);
            if (res.ok) {
                const myOrders = await res.json();
                // 2. Find ALL active jobs (not just the one currrently showing)
                const activeOrders = myOrders.filter(o => ['ready_to_ship', 'shipped', 'accepted'].includes(o.status));

                if (activeOrders.length === 0) {
                    alert("No active jobs found to cancel.");
                    return;
                }

                console.log(`Found ${activeOrders.length} active jobs to cancel.`);

                // 3. Cancel them all in parallel
                await Promise.all(activeOrders.map(order =>
                    fetch(`/api/orders/${order.id}/status?status=cancelled`, { method: 'PUT' })
                ));

                // 4. Reset Dashboard State
                setJobStatus(null);
                setCurrentJob(null);
                setActiveRoute(null);
                setRoutePath(null);
                alert(`Successfully cancelled ${activeOrders.length} active job(s).`);

                // Refresh loads list
                if (driverLocation) {
                    fetchAllJobs(driverLocation.lat, driverLocation.lng);
                }
            } else {
                alert("Failed to fetch jobs for cancellation.");
            }
        } catch (e) {
            console.error("Cancel error:", e);
            alert("Error cancelling jobs. Please check connection.");
        } finally {
            setIsCancelling(false);
        }
    };


    // Fetch actual road route when activeRoute changes
    useEffect(() => {
        if (!activeRoute) {
            setRoutePath(null);
            return;
        }

        const fetchRoute = async () => {
            try {
                // OSRM API call
                const url = `https://router.project-osrm.org/route/v1/driving/${activeRoute.from.lng},${activeRoute.from.lat};${activeRoute.to.lng},${activeRoute.to.lat}?overview=full&geometries=geojson`;

                const response = await fetch(url);
                const data = await response.json();

                if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                    const coordinates = data.routes[0].geometry.coordinates;
                    const path = coordinates.map(coord => [coord[1], coord[0]]);
                    setRoutePath(path);
                } else {
                    // Fallback to straight line
                    setRoutePath([
                        [activeRoute.from.lat, activeRoute.from.lng],
                        [activeRoute.to.lat, activeRoute.to.lng]
                    ]);
                }
            } catch (error) {
                console.error('Error fetching route:', error);
                setRoutePath([
                    [activeRoute.from.lat, activeRoute.from.lng],
                    [activeRoute.to.lat, activeRoute.to.lng]
                ]);
            }
        };

        fetchRoute();
    }, [activeRoute]);

    // Update active route if live farmer location changes
    useEffect(() => {
        if (jobStatus === 'ready_to_ship' && liveFarmerLoc && driverLocation) {
            setActiveRoute({
                from: { lat: driverLocation.lat, lng: driverLocation.lng },
                to: { lat: liveFarmerLoc.lat, lng: liveFarmerLoc.lng }
            });
        }
    }, [liveFarmerLoc, jobStatus]);



    // Simplified map centering helper
    function MapRecenter({ center, follow }) {
        const map = useMap();
        useEffect(() => {
            if (center && follow) {
                map.panTo([center.lat, center.lng], { animate: true });
            }
        }, [center, follow, map]);
        return null;
    }

    // Draggable marker component
    function DraggableMarker({ position, onDragEnd }) {
        const markerRef = React.useRef(null);
        // Event handlers for drag
        const eventHandlers = {
            dragend() {
                const marker = markerRef.current;
                if (marker != null) {
                    const newPos = marker.getLatLng();
                    onDragEnd({ lat: newPos.lat, lng: newPos.lng });
                }
            },
        };

        const icon = L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/1048/1048329.png', // Green delivery truck
            shadowUrl: null,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
        });

        return (
            <Marker
                draggable={true}
                eventHandlers={eventHandlers}
                position={[position.lat, position.lng]}
                ref={markerRef}
                icon={icon}
            >
                <Popup>You are here (Drag to correct location)</Popup>
            </Marker>
        );
    }

    return (
        <div className="relative h-full flex flex-col font-sans overflow-hidden bg-gray-50">
            {/* --- COMPACT TOP CONTROLS --- */}
            <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none">
                <div className="flex items-center justify-between pointer-events-auto">
                    {/* Status & Sim - Minimalist */}
                    <div className="flex items-center gap-2">
                        <div className="bg-white/90 backdrop-blur-md border border-gray-100 shadow-xl rounded-2xl px-3 py-2 flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${isSimulating ? 'bg-purple-500 animate-pulse' :
                                liveStatus === 'live' ? 'bg-green-500' :
                                    'bg-gray-400'
                                }`} />
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                                {isSimulating ? 'Sim' : liveStatus === 'live' ? 'Live' : 'Offline'}
                            </span>
                        </div>

                        <button
                            onClick={() => toggleOnline(true, !isSimulating)}
                            className={`shadow-xl p-2 rounded-xl border transition-all active:scale-90 ${isSimulating ? 'bg-purple-600 text-white border-purple-400' : 'bg-white/90 backdrop-blur-md text-gray-500 border-gray-100'
                                }`}
                        >
                            <RefreshCw className={`h-4 w-4 ${isSimulating ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Minimal Diagnostic (Only show critical if needed, or tiny) */}
                    {driverLocation && (
                        <div className="bg-black/70 backdrop-blur-sm text-[#00ff41] px-3 py-1.5 rounded-lg text-[9px] font-mono shadow-xl flex items-center gap-3">
                            <span>±{Math.round(driverLocation.accuracy)}m</span>
                            <div className="w-[1px] h-2 bg-white/20" />
                            <span>{new Date(driverLocation.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MAIN MAP AREA --- */}
            <div className="flex-1 relative">
                <MapContainer
                    center={driverLocation ? [driverLocation.lat, driverLocation.lng] : [7.8731, 80.7718]}
                    zoom={driverLocation ? 15 : 7}
                    className="h-full w-full"
                    zoomControl={false}
                >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    {driverLocation && (
                        <>
                            <MapRecenter center={driverLocation} follow={shouldFollowDriver} />
                            <DraggableMarker
                                position={driverLocation}
                                onDragEnd={(newPos) => {
                                    setDriverLocation(newPos);
                                    setIsManualCorrection(true);
                                    setShouldFollowDriver(false);
                                    updateDatabase(newPos.lat, newPos.lng, 0, 0);
                                }}
                            />
                            {routePath && (
                                <Polyline positions={routePath} color="#1a7935" weight={6} opacity={0.8} />
                            )}
                            {activeRoute?.to && (
                                <Marker position={[activeRoute.to.lat, activeRoute.to.lng]}>
                                    <Popup>Destination</Popup>
                                </Marker>
                            )}
                        </>
                    )}

                    {/* GPS Connection Overlay */}
                    {(liveStatus === 'connecting' || liveStatus === 'error' || liveStatus === 'offline') && (
                        <div className="absolute inset-0 bg-white/80 z-[2001] flex flex-col items-center justify-center backdrop-blur-sm p-6 text-center">
                            <div className="p-8 bg-white rounded-3xl shadow-xl flex flex-col items-center">
                                {!window.isSecureContext && window.location.hostname !== 'localhost' ? (
                                    <>
                                        <Lock className="h-12 w-12 text-red-500 mb-4" />
                                        <h3 className="font-bold text-lg text-gray-800">Insecure Connection</h3>
                                        <p className="text-xs text-gray-500 mt-2">GPS requires HTTPS.</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-100 border-t-[#1a7935] mb-4"></div>
                                        <h3 className="font-bold text-lg text-gray-800">Finding Satellites...</h3>
                                        <button
                                            onClick={() => toggleOnline(true, true)}
                                            className="mt-4 text-xs text-[#1a7935] font-bold underline cursor-pointer hover:text-green-700"
                                        >
                                            Taking too long? Use Default Location
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </MapContainer>

                {/* --- COMPACT MAP CONTROLS --- */}
                <div className="absolute right-4 bottom-4 z-[1001] flex flex-col gap-2">
                    <button
                        onClick={() => setShouldFollowDriver(!shouldFollowDriver)}
                        className={`p-3 rounded-xl shadow-xl border transition-all active:scale-95 ${shouldFollowDriver ? 'bg-[#1a7935] text-white' : 'bg-white/90 backdrop-blur-md text-gray-600 border-gray-100'}`}
                    >
                        <Navigation className={`h-5 w-5 ${shouldFollowDriver ? 'fill-current' : ''}`} />
                    </button>
                    {isManualCorrection && (
                        <button onClick={() => setIsManualCorrection(false)} className="bg-blue-600 text-white p-3 rounded-xl shadow-xl active:scale-95">
                            <MapPin className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {/* --- SEARCHBAR (Subtle) --- */}
                {!currentJob && (
                    <div className="absolute top-20 left-4 right-4 z-[1001] sm:top-4 sm:left-auto sm:right-20">
                        <form onSubmit={handleSearch} className="relative max-w-xs mx-auto">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search city..."
                                className="w-full bg-white/90 backdrop-blur-md border border-gray-100 shadow-lg rounded-xl pl-4 pr-12 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1a7935]/20"
                            />
                            <button type="submit" className="absolute right-1.5 top-1.5 bottom-1.5 bg-[#1a7935] text-white px-3 rounded-lg text-[10px] font-bold">
                                Find
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* --- COMPACT BOTTOM PANEL --- */}
            <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.08)] z-[1050] border-t border-gray-50 flex flex-col max-h-[40vh] transition-all">
                <div className="w-12 h-1 bg-gray-100 rounded-full mx-auto my-3" />

                <div className="px-6 pb-6 overflow-y-auto">
                    {currentJob ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-start pt-2">
                                <div>
                                    <p className="text-[10px] font-bold text-[#1a7935] uppercase tracking-widest mb-0.5">Active Job</p>
                                    <h3 className="text-lg font-black text-gray-800 leading-tight">{currentJob.description}</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-gray-900 tracking-tighter">Rs.{currentJob.price}</p>
                                </div>
                            </div>

                            <div className="relative flex items-center justify-between px-4 py-6 bg-gray-50 rounded-2xl">
                                <div className="absolute left-10 right-10 h-0.5 bg-gray-200 z-0" />
                                <div className="absolute left-10 h-0.5 bg-[#1a7935] z-0 transition-all duration-700" style={{ width: jobStatus === 'shipped' ? 'calc(100% - 80px)' : '50%' }} />

                                <div className={`relative z-10 h-10 w-10 rounded-xl flex items-center justify-center border-2 ${jobStatus === 'ready_to_ship' ? 'bg-[#1a7935] border-green-100 text-white shadow-lg' : 'bg-white border-green-500 text-[#1a7935]'}`}>
                                    <MapPin className="h-5 w-5" />
                                </div>
                                <div className={`relative z-10 h-10 w-10 rounded-xl flex items-center justify-center border-2 ${jobStatus === 'shipped' ? 'bg-[#1a7935] border-green-100 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-300'}`}>
                                    <Package className="h-5 w-5" />
                                </div>
                            </div>

                            {jobStatus === 'ready_to_ship' && (
                                <div className="space-y-2">
                                    <button onClick={handleConfirmPickup} disabled={!isNearPickup} className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all flex flex-col items-center justify-center gap-1 ${isNearPickup ? 'bg-[#1a7935] text-white shadow-lg' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                                        <span>{isNearPickup ? 'Verify Pickup' : 'Heading to Pickup'}</span>
                                        {!isNearPickup && pickupDistance && (
                                            <span className="text-[8px] opacity-60">{(pickupDistance * 1000).toFixed(0)}m remaining</span>
                                        )}
                                    </button>
                                    <button onClick={handleCancelJob} disabled={isCancelling} className="w-full py-3 bg-red-50 text-red-500 rounded-xl font-bold uppercase tracking-widest text-[9px] hover:bg-red-100 transition-colors disabled:opacity-50">
                                        {isCancelling ? 'Cancelling...' : 'Cancel Job'}
                                    </button>
                                </div>
                            )}

                            {jobStatus === 'shipped' && (
                                <div className="space-y-2">
                                    <button onClick={handleConfirmDelivery} disabled={!isNearDropoff} className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all flex flex-col items-center justify-center gap-1 ${isNearDropoff ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                                        <span>{isNearDropoff ? 'Complete Trip' : 'Heading to Buyer'}</span>
                                        {!isNearDropoff && dropoffDistance && (
                                            <span className="text-[8px] opacity-60">{(dropoffDistance * 1000).toFixed(0)}m remaining</span>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Fallback Cancel for any other weird state */}
                            {jobStatus !== 'ready_to_ship' && jobStatus !== 'shipped' && (
                                <div className="space-y-2 mt-4">
                                    <button onClick={handleCancelJob} disabled={isCancelling} className="w-full py-3 bg-red-50 text-red-500 rounded-xl font-bold uppercase tracking-widest text-[9px] hover:bg-red-100 transition-colors disabled:opacity-50">
                                        {isCancelling ? 'Cancelling...' : 'Force Cancel Active Job'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pt-1">
                                <h3 className="text-xl font-black text-gray-800">New Loads</h3>
                                <span className="bg-[#1a7935]/10 text-[#1a7935] text-[9px] font-black px-3 py-1 rounded-full uppercase">{loads.length} Near You</span>
                            </div>

                            {loads.length === 0 ? (
                                <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">No loads nearby</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[25vh] overflow-y-auto pr-1">
                                    {loads.map(load => (
                                        <div key={load.id} onClick={() => setSelectedLoad(load)} className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedLoad?.id === load.id ? 'border-[#1a7935] bg-green-50 shadow-md' : 'border-gray-50 bg-gray-50 hover:bg-gray-100'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1 pr-4">
                                                    <h4 className="font-black text-gray-800 text-sm leading-tight">{load.description}</h4>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Order Goods: Rs.{load.price}</p>
                                                </div>
                                                <div className="text-right bg-white px-3 py-1.5 rounded-xl shadow-sm border border-green-100">
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Your Earnings</p>
                                                    <span className="text-lg font-black text-[#1a7935]">Rs.{load.hireFee}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col gap-2 mt-3 p-3 bg-white rounded-xl border border-gray-100">
                                                <div className="flex items-start gap-2">
                                                    <MapPin className="h-4 w-4 text-[#1a7935] shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Pickup ({load.distance})</p>
                                                        <span className="text-xs text-gray-700 font-medium line-clamp-2">{load.pickup_address}</span>
                                                    </div>
                                                </div>
                                                <div className="w-0.5 h-3 bg-gray-200 ml-2 border-l border-dashed border-gray-300"></div>
                                                <div className="flex items-start gap-2">
                                                    <Package className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Dropoff</p>
                                                        <span className="text-xs text-gray-700 font-medium line-clamp-2">{load.dropoff_address}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {selectedLoad?.id === load.id && (
                                                <button onClick={(e) => { e.stopPropagation(); handleAcceptLoad(load); }} disabled={acceptingId === load.id} className="w-full mt-4 py-3 bg-[#1a7935] text-white rounded-xl text-[10px] font-black uppercase tracking-wider animate-in fade-in slide-in-from-top-2 disabled:opacity-50 shadow-lg hover:bg-[#145d29]">
                                                    {acceptingId === load.id ? 'Accepting Job...' : 'Accept Job'}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {/* --- REVIEWS MODAL (Optimized) --- */}
            {showReviews && (
                <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md px-0 sm:px-4" onClick={() => setShowReviews(false)}>
                    <div className="bg-white w-full max-w-xl rounded-t-[56px] sm:rounded-[56px] shadow-3xl flex flex-col max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom duration-500" onClick={e => e.stopPropagation()}>
                        <div className="p-10 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                            <div>
                                <h3 className="text-3xl font-black text-gray-800 tracking-tighter">My Stats</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Real Customer Activity</p>
                            </div>
                            <button onClick={() => setShowReviews(false)} className="p-4 bg-white shadow-xl rounded-3xl border border-gray-100 active:scale-90 transition-transform">
                                <X className="h-8 w-8 text-gray-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 space-y-8">
                            {reviews.length === 0 ? (
                                <div className="text-center py-20 px-10">
                                    <Star className="h-16 w-16 text-gray-100 mx-auto mb-6" />
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-sm leading-relaxed">No trip reviews found. Build your reputation by completing loads!</p>
                                </div>
                            ) : (
                                reviews.map((review, idx) => (
                                    <div key={idx} className="bg-gray-50 p-8 rounded-[48px] border border-gray-100/50">
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex gap-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />
                                                ))}
                                            </div>
                                            <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">{new Date(review.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-gray-700 text-md leading-relaxed font-bold italic tracking-tight mb-4">"{review.comment}"</p>
                                        <p className="text-[10px] font-black text-[#1a7935] uppercase tracking-widest opacity-60">— VERIFIED BUYER</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
