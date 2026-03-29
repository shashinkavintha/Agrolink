import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, Search, CheckCircle, Clock } from 'lucide-react';

export default function FarmerRequests() {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [allMarketRequests, setAllMarketRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('notifications'); 
    const [isTopSeller, setIsTopSeller] = useState(false);

    useEffect(() => {
        if (user) {
            fetchInitialData();
        }
    }, [user, activeTab]);

    const fetchInitialData = async () => {
        if (!user) return;
        setLoading(true);

        try {
            // Check Profile for Top Seller Status
            const profileRes = await fetch(`/api/profiles/${user.id}`);
            if (profileRes.ok) {
                const profile = await profileRes.json();
                
                const ws = profile.wilsonScore || 0;
                const odr = profile.orderDefectRate || 0;
                const lsr = profile.lateShipmentRate || 0;
                const cancel = profile.preFulfillmentCancellationRate || 0;

                const topSellerStatus = ws >= 0.5 && odr <= 1.0 && lsr <= 4.0 && cancel <= 2.5;
                setIsTopSeller(topSellerStatus);

                if (topSellerStatus) {
                    if (activeTab === 'notifications') {
                        const notifResponse = await fetch(`/api/notifications/${user.id}`);
                        const notifications = await notifResponse.json();
                        setRequests(notifications);
                    } else if (activeTab === 'all') {
                        const allReqResponse = await fetch(`/api/requests`);
                        const allReqs = await allReqResponse.json();
                        // Filter out ACCEPTED ones
                        const openReqs = allReqs.filter(r => r.status === 'OPEN');
                        setAllMarketRequests(openReqs);
                    }
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const [selectedRequest, setSelectedRequest] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const handleViewDetails = async (item) => {
        const targetId = item.relatedId || item.id;
        if (!targetId) return;
        setDetailsLoading(true);
        try {
            const response = await fetch(`/api/requests/${targetId}`);
            if (response.ok) {
                const data = await response.json();
                setSelectedRequest(data);
            } else {
                console.error("Failed to fetch request details");
            }
        } catch (error) {
            console.error("Error fetching details:", error);
        } finally {
            setDetailsLoading(false);
        }
    };

    const closeDetails = () => {
        setSelectedRequest(null);
    };

    const handleNavigateToChat = async () => {
        if (!selectedRequest || !user) return;
        setDetailsLoading(true);
        try {
            // First create or get conversation
            const payload = {
                farmerId: user.id, // we are the farmer
                buyerId: selectedRequest.buyer.id
            };
            const response = await fetch('/api/chat/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const conv = await response.json();
                closeDetails();
                window.location.href = `/chat/${conv.id}`; // navigate
            }
        } catch (error) {
            console.error("Error creating chat:", error);
            alert("Could not start chat.");
        } finally {
            setDetailsLoading(false);
        }
    };

    return (
        <div className="p-8">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Buyer Requests</h1>
                    <p className="text-gray-500">View and respond to custom offers from buyers</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {!isTopSeller && !loading ? (
                    <div className="p-16 text-center">
                        <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">Exclusive Top Seller Feature</h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-8">
                            Only farmers who have achieved <strong className="text-yellow-600">Top Seller</strong> status can receive and view custom buyer requests. Improve your Wilson Score and maintain excellent delivery rates to unlock this feature!
                        </p>
                        <a href="/farmer/dashboard" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 transition-all">
                            Check Performance Targets
                        </a>
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b border-gray-100 flex gap-4">
                            <button
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
                                onClick={() => setActiveTab('notifications')}
                            >
                                My Notifications
                            </button>
                            <button
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'all' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
                                onClick={() => setActiveTab('all')}
                            >
                                All Market Requests
                            </button>
                        </div>

                        {loading ? (
                            <div className="p-8 text-center text-gray-400">Loading requests...</div>
                        ) : activeTab === 'notifications' && requests.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Bell className="w-8 h-8 text-gray-300" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No new notifications</h3>
                                <p className="text-gray-500 mt-2">You're all caught up! Check back later.</p>
                            </div>
                        ) : activeTab === 'all' && allMarketRequests.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-8 h-8 text-gray-300" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No market requests</h3>
                                <p className="text-gray-500 mt-2">There are no open buyer requests right now.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {(activeTab === 'notifications' ? requests : allMarketRequests).map((item) => {
                                    const isNotif = activeTab === 'notifications';
                                    return (
                                        <div key={item.id} className={`p-6 hover:bg-gray-50 transition-colors ${isNotif && !item.isRead ? 'bg-blue-50/50' : ''}`}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex gap-4">
                                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <Bell className="w-5 h-5 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900">{isNotif ? item.title : `${item.category} Request`}</h4>
                                                        <p className="text-gray-600 mt-1">{isNotif ? item.message : item.description}</p>
                                                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-4 h-4" />
                                                                {new Date(item.createdAt).toLocaleDateString()}
                                                            </span>
                                                            <button
                                                                onClick={() => handleViewDetails(item)}
                                                                className="text-green-600 font-medium hover:underline"
                                                            >
                                                                {detailsLoading && selectedRequest?.id === (item.relatedId || item.id) ? 'Loading...' : 'View Details'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                {isNotif && !item.isRead && (
                                                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Request Details Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800">Request Details</h2>
                            <button onClick={closeDetails} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <span className="sr-only">Close</span>
                                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</label>
                                <p className="text-lg font-medium text-gray-900">{selectedRequest.category}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
                                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 mt-1">{selectedRequest.description}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quantity</label>
                                    <p className="font-semibold text-gray-900">{selectedRequest.quantity} {selectedRequest.unit}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Budget</label>
                                    <p className="font-semibold text-green-600">LKR {selectedRequest.budget}</p>
                                </div>
                            </div>
                            {selectedRequest.buyer && (
                                <div className="pt-4 border-t border-gray-100 mt-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Requested By</label>
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
                                            {selectedRequest.buyer.avatarUrl ? (
                                                <img src={selectedRequest.buyer.avatarUrl} alt={selectedRequest.buyer.fullName} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-green-100 text-green-700 font-bold">
                                                    {selectedRequest.buyer.fullName?.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{selectedRequest.buyer.fullName}</p>
                                            <p className="text-xs text-gray-500">{selectedRequest.buyer.email}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={closeDetails} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors">
                                Close
                            </button>
                            <button
                                onClick={handleNavigateToChat}
                                disabled={detailsLoading}
                                className="px-5 py-2.5 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200 transition-colors flex items-center gap-2"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                Negotiate in Chat
                            </button>
                            <button
                                onClick={() => alert('Direct accept coming soon')}
                                className="px-5 py-2.5 bg-green-600 text-white font-medium hover:bg-green-700 rounded-xl shadow-lg shadow-green-200 transition-colors"
                            >
                                Accept Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
