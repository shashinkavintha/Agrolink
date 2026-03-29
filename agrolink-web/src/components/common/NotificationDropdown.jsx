import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotificationDropdown({ userId }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (userId) {
            fetchNotifications();
            // Optional: Poll for new notifications every 30s
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [userId]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    const fetchNotifications = async () => {
        try {
            const response = await fetch(`/api/notifications/${userId}`);
            if (response.ok) {
                const data = await response.json();
                setNotifications(data);
                const unread = data.filter(n => !n.isRead).length;
                setUnreadCount(unread);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    };

    const markAsRead = async (id, event) => {
        event.stopPropagation(); // Prevent closing dropdown or navigating
        try {
            await fetch(`/api/notifications/${id}/read`, {
                method: 'PUT'
            });
            // Update local state
            setNotifications(notifications.map(n =>
                n.id === id ? { ...n, isRead: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.isRead) {
            markAsRead(notification.id, { stopPropagation: () => { } });
        }

        setIsOpen(false);

        // Navigate based on type
        if (notification.type === 'REQUEST_ALERT') {
            navigate('/farmer/requests'); // Assuming this is for farmer for now
        } else if (notification.type === 'ORDER_UPDATE') {
            navigate('/my-orders');
        } else if (notification.type === 'CHAT_MESSAGE') {
            navigate(`/chat/${notification.relatedId}`);
        } else if (notification.type === 'CUSTOM_OFFER') {
            navigate('/inbox'); // Redirect to inbox as relatedId is offerId
        } else {
            // Default navigation handle
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors outline-none focus:ring-2 focus:ring-green-500/20"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-semibold text-gray-800">Notifications</h3>
                        {unreadCount > 0 && (
                            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                {unreadCount} New
                            </span>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                No notifications yet
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer relative group ${!notification.isRead ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!notification.isRead ? 'bg-blue-500' : 'bg-transparent'}`}></div>
                                            <div className="flex-1">
                                                <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-2">
                                                    {new Date(notification.createdAt).toLocaleDateString()} • {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            {!notification.isRead && (
                                                <button
                                                    onClick={(e) => markAsRead(notification.id, e)}
                                                    className="opacity-0 group-hover:opacity-100 absolute right-2 top-2 p-1.5 hover:bg-green-100 text-green-600 rounded-full transition-all"
                                                    title="Mark as read"
                                                >
                                                    <Check className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
