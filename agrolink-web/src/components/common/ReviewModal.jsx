import React, { useState } from 'react';
import axios from 'axios';
import { X, Trash2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const ReviewModal = ({ isOpen, onClose, revieweeName, orderId, revieweeId, productId, shopProductId, reviewerId, onReviewSuccess }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isUpdate, setIsUpdate] = useState(false);
    const [existingReviewId, setExistingReviewId] = useState(null);
    const [deleting, setDeleting] = useState(false);

    React.useEffect(() => {
        if (isOpen && orderId && reviewerId && (revieweeId || productId || shopProductId)) {
            setLoading(true);
            const params = new URLSearchParams({ orderId, reviewerId });
            if (revieweeId) params.append('revieweeId', revieweeId);
            if (productId) params.append('productId', productId);
            if (shopProductId) params.append('shopProductId', shopProductId);

            axios.get(`/api/reviews?${params.toString()}`)
                .then(res => {
                    if (res.data) {
                        setRating(res.data.rating);
                        setComment(res.data.comment || '');
                        setExistingReviewId(res.data.id);
                        setIsUpdate(true);
                    } else {
                        setIsUpdate(false);
                        setExistingReviewId(null);
                        setRating(0);
                        setComment('');
                    }
                })
                .catch(() => {
                    // Ignore 404 or other errors, assume new review
                    setIsUpdate(false);
                    setExistingReviewId(null);
                    setRating(0);
                    setComment('');
                })
                .finally(() => setLoading(false));
        }
    }, [isOpen, orderId, reviewerId, revieweeId, productId, shopProductId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            setError('Please select a rating');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let generatedSellerReply = null;

            // Generate an automated reply using sentiment analysis via Gemini API
            if (comment && comment.trim().length > 0) {
                try {
                    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

                    let sentimentPrompt;
                    if (rating <= 2) {
                        // Negative review
                        sentimentPrompt = `The following is a NEGATIVE buyer review (rated ${rating}/5). Analyze the statement and generate a short, sincere apology from the seller. Express that we are truly sorry for their experience. Then kindly ask them to please raise a support ticket mentioning the specific problem they faced with the product, so our team can look into it and resolve it as soon as possible. Keep it under 3 sentences. Do NOT use generic professional language. Be genuinely apologetic.\n\nReview: "${comment}"`;
                    } else if (rating >= 4) {
                        // Positive review
                        sentimentPrompt = `The following is a POSITIVE buyer review (rated ${rating}/5). Analyze the statement and generate a short, warm thank-you reply from the seller. Express genuine gratitude for their kind words and support. Keep it under 2-3 sentences. Be heartfelt, not generic.\n\nReview: "${comment}"`;
                    } else {
                        // Neutral review (3 stars)
                        sentimentPrompt = `The following is a NEUTRAL buyer review (rated ${rating}/5). Analyze the statement and generate a short, balanced reply from the seller. Thank them for their honest feedback and mention that the team will work to improve. If there's any concern mentioned, suggest raising a support ticket. Keep it under 3 sentences.\n\nReview: "${comment}"`;
                    }

                    const response = await ai.models.generateContent({
                        model: 'gemini-2.0-flash',
                        contents: sentimentPrompt,
                        config: {
                            temperature: 0.7,
                            maxOutputTokens: 200,
                        }
                    });
                    if (response.text) {
                        generatedSellerReply = response.text;
                    }
                } catch (genError) {
                    console.error("Gemini API error during statement analysis:", genError);
                }
            }

            const payload = {
                orderId,
                reviewerId,
                rating,
                comment,
                sellerReply: generatedSellerReply
            };
            if (revieweeId) payload.revieweeId = revieweeId;
            if (productId) payload.productId = productId;
            if (shopProductId) payload.shopProductId = shopProductId;

            if (isUpdate) {
                await axios.put('/api/reviews', payload);
            } else {
                await axios.post('/api/reviews', payload);
            }
            onReviewSuccess();
            onClose();
        } catch (err) {
            // Check if error is "Review already exists" -> if so, try switching to update?
            // Or just display error.
            if (!isUpdate && err.response?.data?.message?.includes('already exists')) {
                // Retry as update? No, let user know.
                setError('Review already exists. Please refresh and try editing.');
            } else {
                setError('Failed to submit review: ' + (err.response?.data?.message || err.message));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!existingReviewId) return;
        if (!window.confirm('Are you sure you want to delete your review? This cannot be undone.')) return;
        setDeleting(true);
        setError(null);
        try {
            await axios.delete(`/api/reviews/${existingReviewId}?reviewerId=${reviewerId}`);
            onReviewSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to delete review', err);
            setError('Failed to delete review: ' + (err.response?.data?.message || err.message));
        } finally {
            setDeleting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X className="h-6 w-6" />
                </button>

                <h3 className="text-xl font-bold mb-6 text-gray-900">{isUpdate ? 'Edit Review for' : 'Review'} {revieweeName}</h3>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="flex justify-center mb-8 gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className={`text-4xl transition-colors ${rating >= star ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-200'}`}
                            >
                                ★
                            </button>
                        ))}
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Comment (Optional)</label>
                        <textarea
                            className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#1a7935] focus:border-transparent outline-none transition-all resize-none"
                            rows="4"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Share your experience..."
                        />
                    </div>

                    <div className="flex justify-between items-center gap-3">
                        {isUpdate && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleting || loading}
                                className="px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 text-sm"
                            >
                                <Trash2 className="h-4 w-4" />
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        )}
                        <div className="flex gap-3 ml-auto">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || rating === 0}
                                className="px-5 py-2.5 bg-[#1a7935] text-white rounded-xl font-bold hover:bg-[#145d29] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-900/20"
                            >
                                {loading ? (isUpdate ? 'Updating...' : 'Submitting...') : (isUpdate ? 'Update Review' : 'Submit Review')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReviewModal;
