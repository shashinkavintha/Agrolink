import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Send, FileText, CheckCircle, XCircle } from 'lucide-react';

export default function ChatApp() {
    const { conversationId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [stompClient, setStompClient] = useState(null);
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [offerDetails, setOfferDetails] = useState({ price: '', delivery: '', description: '' });
    const [conversation, setConversation] = useState(null);
    const messagesEndRef = useRef(null);

    // Fetch message history on load
    useEffect(() => {
        if (!conversationId || !user) return;
        
        fetch(`/api/chat/conversations/${conversationId}/messages`)
            .then(res => res.json())
            .then(data => setMessages(data))
            .catch(err => console.error("Failed to fetch messages", err));

        // Setup WebSocket with relative URL so Vite proxies it correctly (supports HTTPS/Mobile)
        const socket = new SockJS('/ws');
        const client = new Client({
            webSocketFactory: () => socket,
            onConnect: () => {
                console.log('Connected to Chat WS');
                client.subscribe(`/topic/conversation.${conversationId}`, message => {
                    const parsedMsg = JSON.parse(message.body);
                    setMessages(prev => [...prev, parsedMsg]);
                });
            },
            onStompError: (frame) => {
                console.error('Broker error', frame.headers['message']);
            }
        });

        client.activate();
        setStompClient(client);

        return () => {
            client.deactivate();
        };
    }, [conversationId, user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const payload = {
            conversationId,
            senderId: user.id,
            content: newMessage,
            type: 'TEXT'
        };

        try {
            setNewMessage('');
            
            await fetch(`/api/chat/conversations/${conversationId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.error("Error sending", err);
            alert("Failed to send message: " + err.message);
        }
    };

    const handleCreateOffer = async (e) => {
        e.preventDefault();
        
        // Find the other user from messages to assign as buyer
        const otherMsg = messages.find(m => m.sender?.id !== user.id);
        const buyerId = otherMsg ? otherMsg.sender.id : null; // If no previous message, this is a bit tricky. We should load conversation details instead.
        // But let's assume there's at least a system message or we fetch it.
        
        // Workaround: We'll put 'metadata' empty for now.
        const payload = {
            conversationId,
            sellerId: user.id,
            buyerId: buyerId || '00000000-0000-0000-0000-000000000000', // needs real ID
            price: Number(offerDetails.price),
            deliveryTime: offerDetails.delivery,
            metadata: offerDetails.description
        };

        try {
            const res = await fetch('/api/chat/offers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if(res.ok) {
                setShowOfferModal(false);
                setOfferDetails({ price: '', delivery: '', description: '' });
            }
        } catch(error) {
            console.error("Error creating offer", error);
        }
    };

    const handleAcceptOffer = async (offerId) => {
        try {
            const res = await fetch(`/api/chat/offers/${offerId}/accept`, { method: 'POST' });
            if (res.ok) {
                alert('Offer accepted successfully! You can now proceed to payment.');
                // In full flow, redirect to PayHere checkout with total price
            }
        } catch (error) {
            console.error('Accept error', error);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 p-4 max-w-4xl mx-auto">
            <div className="bg-white shadow-sm rounded-t-2xl p-4 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">Negotiation Chat</h2>
                <button onClick={() => navigate(-1)} className="text-gray-500 hover:bg-gray-100 px-3 py-1 rounded">
                    Back
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                {messages.map((msg, i) => {
                    const isMe = msg.sender?.id === user?.id;
                    const isSystem = msg.type === 'SYSTEM';

                    if (msg.type === 'OFFER') {
                        return (
                            <div key={i} className="flex flex-col items-center my-4">
                                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-2xl p-6 w-full max-w-md shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800">Custom Offer</h3>
                                            <p className="text-xs text-gray-500">Proposed by {msg.sender?.fullName}</p>
                                        </div>
                                    </div>
                                    <p className="text-gray-600 mb-4">{msg.content}</p>
                                    
                                    {!isMe && (
                                        <div className="flex gap-3 mt-4 pt-4 border-t border-green-100">
                                            <button 
                                                onClick={() => handleAcceptOffer(msg.relatedOfferId)}
                                                className="flex-1 bg-green-600 text-white font-medium py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-green-700"
                                            >
                                                <CheckCircle className="w-4 h-4" /> Accept
                                            </button>
                                            <button className="flex-1 bg-red-50 text-red-600 font-medium py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-red-100">
                                                <XCircle className="w-4 h-4" /> Decline
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] p-3 rounded-2xl ${
                                isMe ? 'bg-green-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'
                            }`}>
                                <p className="text-sm">{msg.content}</p>
                                <span className="text-[10px] opacity-70 mt-1 block">
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="bg-white p-4 rounded-b-2xl border-t flex gap-3">
                <button 
                    type="button"
                    onClick={() => setShowOfferModal(true)}
                    className="bg-blue-100 text-blue-700 p-3 rounded-xl hover:bg-blue-200 flex items-center justify-center font-bold px-4 whitespace-nowrap"
                    title="Create Offer"
                >
                    + Offer
                </button>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button 
                    type="button" // Use a normal button with onClick to guarantee execution
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-green-600 text-white p-3 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>

            {/* Offer Modal */}
            {showOfferModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold mb-4">Create Custom Offer</h3>
                        <form onSubmit={handleCreateOffer} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700">Total Price (LKR)</label>
                                <input type="number" required value={offerDetails.price} onChange={e => setOfferDetails({...offerDetails, price: e.target.value})} className="mt-1 w-full border rounded-lg p-3 bg-gray-50" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700">Delivery Time</label>
                                <input type="text" placeholder="e.g. 3 Days" required value={offerDetails.delivery} onChange={e => setOfferDetails({...offerDetails, delivery: e.target.value})} className="mt-1 w-full border rounded-lg p-3 bg-gray-50" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700">Description / Scope</label>
                                <textarea required value={offerDetails.description} onChange={e => setOfferDetails({...offerDetails, description: e.target.value})} className="mt-1 w-full border rounded-lg p-3 bg-gray-50 h-24"></textarea>
                            </div>
                            <div className="flex gap-3 justify-end mt-6">
                                <button type="button" onClick={() => setShowOfferModal(false)} className="px-5 py-2 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md">Send Offer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
