import React, { useState } from 'react';
import { Star, MessageSquarePlus, Copy, X, CheckCircle, Code, ShieldCheck } from 'lucide-react';
import axios from 'axios';

// Dynamic Star Rating Component
const DynamicStarRating = ({ rating, totalReviews }) => {
    return (
        <div className="flex flex-col items-center sm:items-start">
            <div className="flex items-center gap-3">
                <span className="text-4xl font-black text-gray-900 leading-none">{rating.toFixed(1)}</span>
                <div className="flex flex-col">
                    <div className="flex text-yellow-400">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={`h-5 w-5 ${star <= Math.round(rating) ? 'fill-current' : 'text-gray-200'}`}
                            />
                        ))}
                    </div>
                    <span className="text-sm font-medium text-gray-500 mt-1">Based on {totalReviews} reviews</span>
                </div>
            </div>
        </div>
    );
};

export default function TestimonialsWidget({ reviews = [], averageRating = 0, farmerId }) {
    const [localReviews, setLocalReviews] = React.useState(reviews);
    
    React.useEffect(() => {
        if (reviews.length > 0) {
            setLocalReviews(reviews);
        }
    }, [reviews]);

    const [showWidgetCode, setShowWidgetCode] = useState(false);
    const [copied, setCopied] = useState(false);
    
    // Reply state
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');

    const widgetCode = `<script src="https://widget.trustpulse.com/embed.js" data-id="${farmerId || 'YOUR_ID'}"></script>\n<div id="trustpulse-widget-container"></div>`;

    const handleCopyCode = () => {
        navigator.clipboard.writeText(widgetCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const submitReply = async (reviewId) => {
        try {
            const res = await axios.put(`/api/reviews/${reviewId}/reply`, { reply: replyText });
            // Update local state to reflect the reply
            setLocalReviews(prev => prev.map(r => r.id === reviewId ? { ...r, sellerReply: replyText } : r));
            setReplyingTo(null);
            setReplyText('');
        } catch (err) {
            console.error("Failed to submit reply", err);
            const errorDetails = err.response?.data?.message || err.response?.data || err.message || "Unknown backend error";
            alert(`Failed to submit reply: ${typeof errorDetails === 'string' ? errorDetails : JSON.stringify(errorDetails)}`);
        }
    };

    // Auto-read and filter reviews: top 3 positive reviews (sorted by rating first, then date)
    const displayReviews = [...localReviews]
        .filter(r => r.rating >= 4)
        .sort((a, b) => {
            if (b.rating !== a.rating) {
                return b.rating - a.rating; // Highest rating first
            }
            return new Date(b.createdAt) - new Date(a.createdAt); // Newest first
        })
        .slice(0, 3);

    const localAverage = localReviews.length > 0 
        ? localReviews.reduce((acc, curr) => acc + (curr.rating || 0), 0) / localReviews.length 
        : 0;

    return (
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 overflow-hidden relative">
            {/* Background design elements */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-gradient-to-br from-green-50 to-[#1a7935]/5 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 mb-4">Customer Reputation</h2>
                    <DynamicStarRating rating={localAverage} totalReviews={localReviews.length} />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setShowWidgetCode(!showWidgetCode)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl transition-colors border border-gray-200 text-sm"
                    >
                        <Code className="h-4 w-4" />
                        {showWidgetCode ? 'Hide Integration' : 'Embed Widget'}
                    </button>
                </div>
            </div>

            {/* Widget Integration Code Block */}
            {showWidgetCode && (
                <div className="mb-8 bg-gray-900 rounded-2xl p-5 relative min-h-[100px] shadow-inner animate-fade-in-up">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Third-Party Integration (TrustPulse / Senja)</span>
                        <button 
                            onClick={handleCopyCode}
                            className="text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                        >
                            {copied ? <CheckCircle className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                            {copied ? 'Copied' : 'Copy Code'}
                        </button>
                    </div>
                    <pre className="text-green-400 font-mono text-sm overflow-x-auto pb-2 custom-scrollbar whitespace-pre-wrap word-break">
                        {widgetCode}
                    </pre>
                </div>
            )}

            {/* Reviews Carousel/Grid */}
            {displayReviews.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-500 font-medium">No positive reviews yet. Keep providing great service to build your reputation!</p>
                </div>
            ) : (
                <div className="flex overflow-x-auto gap-6 pb-6 pt-2 snap-x snap-mandatory custom-scrollbar relative z-10 -mx-2 px-2">
                    {displayReviews.map((review) => (
                        <div 
                            key={review.id} 
                            className="bg-white min-w-[300px] md:min-w-[350px] max-w-[400px] p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow snap-start flex flex-col justify-between group"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex text-yellow-400">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-gray-200'}`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                                        {new Date(review.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed mb-6 line-clamp-4 group-hover:line-clamp-none transition-all">"{review.comment}"</p>
                            </div>
                            
                            <div className="flex items-center gap-3 pt-4 border-t border-gray-50 mt-auto">
                                <div className="w-8 h-8 bg-gradient-to-br from-[#1a7935] to-green-400 rounded-full flex items-center justify-center text-xs font-black text-white shadow-sm ring-2 ring-white shrink-0">
                                    {review.reviewer?.email?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1">
                                    <span className="block text-sm font-bold text-gray-900 truncate max-w-[150px]">{review.reviewer?.email?.split('@')[0] || 'Anonymous'}</span>
                                    <span className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide">Verified Buyer</span>
                                </div>
                            </div>
                            
                            {/* Seller Reply UI */}
                            {review.sellerReply ? (
                                <div className="mt-4 bg-gray-50 p-3 rounded-xl border border-gray-100 text-sm">
                                    <p className="font-bold text-gray-800 text-xs mb-1 flex items-center gap-1">
                                        <ShieldCheck className="h-3 w-3 text-[#1a7935]" /> Your Reply:
                                    </p>
                                    <p className="text-gray-600 italic text-xs leading-relaxed">"{review.sellerReply}"</p>
                                </div>
                            ) : (
                                <div className="mt-4">
                                    {replyingTo === review.id ? (
                                        <div className="flex flex-col gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                            <textarea
                                                className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:ring-[#1a7935] focus:border-[#1a7935] transition-all resize-none"
                                                placeholder="Write a public reply..."
                                                rows={2}
                                                value={replyText}
                                                onChange={e => setReplyText(e.target.value)}
                                                autoFocus
                                            />
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => setReplyingTo(null)} className="text-[10px] font-bold text-gray-500 hover:bg-gray-200 px-2 py-1 rounded transition-colors">CANCEL</button>
                                                <button onClick={() => submitReply(review.id)} className="text-[10px] font-bold bg-[#1a7935] text-white px-3 py-1 rounded shadow-sm hover:bg-[#145d29] transition-colors">POST REPLY</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={() => { setReplyingTo(review.id); setReplyText(''); }} className="text-xs font-bold text-[#1a7935] hover:text-[#145d29] hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                                            <MessageSquarePlus className="h-3 w-3" />
                                            Reply to Buyer
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}
