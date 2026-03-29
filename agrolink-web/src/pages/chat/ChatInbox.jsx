import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, ArrowRight } from 'lucide-react';

export default function ChatInbox() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);

    useEffect(() => {
        if (user) {
            fetch(`/api/chat/conversations/user/${user.id}`)
                .then(res => res.json())
                .then(data => setConversations(data))
                .catch(err => console.error(err));
        }
    }, [user]);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                    <MessageSquare className="w-8 h-8 text-blue-600" />
                    My Negotiations
                </h1>

                {conversations.length === 0 ? (
                    <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                        <p className="text-gray-500 text-lg">No active chats found.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {conversations.map(conv => {
                            const otherPerson = conv.farmer?.id === user?.id ? conv.buyer : conv.farmer;
                            return (
                                <div 
                                    key={conv.id} 
                                    onClick={() => navigate(`/chat/${conv.id}`)}
                                    className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md cursor-pointer flex justify-between items-center transition-all bg-gradient-to-r hover:from-blue-50 hover:to-white"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex justify-center items-center text-blue-700 font-bold text-xl">
                                            {otherPerson?.fullName?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">{otherPerson?.fullName || 'Unknown User'}</h3>
                                            <p className="text-sm text-gray-500">Negotiation Chat</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="text-gray-400" />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
