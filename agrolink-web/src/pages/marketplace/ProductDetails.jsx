import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ShoppingCart, Leaf, Truck, ShieldCheck, MapPin, User, Star } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

export default function ProductDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('description');
    const [reviews, setReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [chatLoading, setChatLoading] = useState(false);

    const { addToCart } = useCart();

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                // Fetch approved products and find the one matching ID (or fetch by ID if endpoint exists)
                // Assuming we use the list endpoint for now or creates a specific one
                // We'll use the list and filter for now as we don't have a direct public "get one" endpoint confirmed yet
                // WAIT, ProductController has getApprovedProducts. 
                // Let's assume we can fetch all and filter, or I should really add a details endpoint.
                // But efficient way: backend SHOULD have getById. I will use a direct fetch pattern assuming standard REST 
                // If it fails, I'll fallback to list.
                // Actually, let's just use the list for safety as I didn't verify a single get endpoint in Controller.
                const res = await axios.get('/api/products/approved');
                const found = res.data.find(p => p.id === id);
                setProduct(found);

                // If not found in approved, maybe check general if debugging? no, buyer only sees approved.
            } catch (err) {
                console.error("Failed to load product", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    const handleStartChat = async () => {
        if (!user) {
            alert("Please login to message the farmer.");
            navigate('/login');
            return;
        }
        
        let farmerId = product.farmer?.id || product.farmerId;
        // In the provided code snippet, the product usually has the farmer nested
        if (!farmerId) {
            alert("Farmer details not available for this product.");
            return;
        }

        setChatLoading(true);
        try {
            const payload = {
                farmerId: farmerId,
                buyerId: user.id
            };
            const response = await fetch('/api/chat/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const conv = await response.json();
                navigate(`/chat/${conv.id}`);
            } else {
                alert("Could not start chat. Please try again.");
            }
        } catch (error) {
            console.error("Error creating chat:", error);
            alert("Error starting chat.");
        } finally {
            setChatLoading(false);
        }
    };

    useEffect(() => {
        if (product && activeTab === 'reviews') {
            setLoadingReviews(true);
            axios.get(`/api/reviews/product/${product.id}`)
                .then(res => setReviews(res.data))
                .catch(err => console.error("Failed to load reviews", err))
                .finally(() => setLoadingReviews(false));
        }
    }, [product, activeTab]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1a7935] border-t-transparent"></div>
        </div>
    );

    if (!product) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Product Not Found</h2>
            <button onClick={() => navigate('/')} className="text-[#1a7935] hover:underline flex items-center">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Marketplace
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12">
            <div className="container mx-auto px-4 max-w-6xl">

                {/* Breadcrumb / Back */}
                <button
                    onClick={() => navigate('/')}
                    className="mb-8 flex items-center text-gray-500 hover:text-[#1a7935] transition-colors"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Marketplace
                </button>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2">

                        {/* Image Section */}
                        <div className="h-96 lg:h-auto bg-gray-100 relative">
                            {product.imageUrl ? (
                                <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                    <Leaf className="h-20 w-20 opacity-20 mb-4" />
                                    <span className="text-sm">No Image Available</span>
                                </div>
                            )}

                            {/* Category Badge */}
                            <div className="absolute top-6 left-6">
                                <span className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-sm font-bold text-[#1a7935] shadow-sm flex items-center">
                                    <Leaf className="h-4 w-4 mr-2" />
                                    {product.category?.name}
                                </span>
                            </div>
                        </div>

                        {/* Details Section */}
                        <div className="p-8 lg:p-12 flex flex-col">
                            <div className="mb-auto">
                                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{product.name}</h1>

                                <div className="flex items-center gap-4 mb-6 text-sm">
                                    <div className="flex items-center text-yellow-500">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`h-4 w-4 ${i < Math.round(product.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`}
                                            />
                                        ))}
                                        <span className="text-gray-400 ml-2">({product.rating ? product.rating : 'No reviews'})</span>
                                    </div>
                                    <span className="text-gray-300">|</span>
                                    <span className="text-gray-500 flex items-center">
                                        <MapPin className="h-4 w-4 mr-1" />
                                        Nuwara Eliya, Sri Lanka
                                    </span>
                                </div>

                                <div className="text-4xl font-bold text-[#1a7935] mb-2">
                                    Rs. {product.price} <span className="text-lg text-gray-500 font-normal">/ {product.unit}</span>
                                </div>
                                <p className="text-green-600 font-medium mb-8 bg-green-50 inline-block px-3 py-1 rounded-lg border border-green-100">
                                    {product.quantity} {product.unit} In Stock
                                </p>

                                {/* Quantity Selector */}
                                <div className="mb-8">
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Quantity needed ({product.unit})</label>
                                    <div className="flex items-center max-w-xs bg-gray-50 rounded-xl border border-gray-200 p-1">
                                        <button
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="w-12 h-10 flex items-center justify-center text-gray-500 hover:text-[#1a7935] hover:bg-white rounded-lg transition-all"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            value={quantity}
                                            onChange={(e) => setQuantity(Math.min(product.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                                            className="flex-1 text-center bg-transparent font-bold text-gray-800 focus:outline-none"
                                        />
                                        <button
                                            onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                                            className="w-12 h-10 flex items-center justify-center text-gray-500 hover:text-[#1a7935] hover:bg-white rounded-lg transition-all"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-4 mb-4">
                                    <button
                                        className="flex-1 bg-[#1a7935] text-white py-4 rounded-xl font-bold hover:bg-[#145d29] transition-all shadow-lg hover:shadow-[#1a7935]/30 flex items-center justify-center gap-2 transform active:scale-[0.98]"
                                        onClick={() => {
                                            addToCart({ ...product, quantity });
                                            alert("Added to cart successfully!");
                                        }}
                                    >
                                        <ShoppingCart className="h-5 w-5" />
                                        Add to Cart
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!user) {
                                                alert("Please login to buy products.");
                                                navigate('/login');
                                                return;
                                            }
                                            addToCart({ ...product, quantity });
                                            navigate('/checkout');
                                        }}
                                        className="px-6 py-4 border-2 border-[#1a7935] text-[#1a7935] rounded-xl font-bold hover:bg-green-50 transition-colors"
                                    >
                                        Buy Now
                                    </button>
                                </div>
                                
                                <button
                                    onClick={handleStartChat}
                                    disabled={chatLoading}
                                    className="w-full bg-blue-50 text-blue-600 font-bold py-4 rounded-xl mb-8 border border-blue-100 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                    {chatLoading ? 'Starting Chat...' : 'Message Farmer / Negotiate'}
                                </button>
                            </div>

                            {/* Trust Badges */}
                            <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-8">
                                <div className="text-center">
                                    <div className="bg-green-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-[#1a7935]">
                                        <Leaf className="h-6 w-6" />
                                    </div>
                                    <p className="text-xs font-bold text-gray-700">100% Organic</p>
                                </div>
                                <div className="text-center">
                                    <div className="bg-green-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-[#1a7935]">
                                        <Truck className="h-6 w-6" />
                                    </div>
                                    <p className="text-xs font-bold text-gray-700">Fast Delivery</p>
                                </div>
                                <div className="text-center">
                                    <div className="bg-green-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-[#1a7935]">
                                        <ShieldCheck className="h-6 w-6" />
                                    </div>
                                    <p className="text-xs font-bold text-gray-700">Quality Check</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs Section for Description/Farmer Info */}
                    <div className="border-t border-gray-100 bg-gray-50/50 p-8 lg:p-12">
                        <div className="flex gap-8 border-b border-gray-200 mb-8">
                            <button
                                onClick={() => setActiveTab('description')}
                                className={`pb-4 font-bold text-sm uppercase tracking-wide transition-colors border-b-2 ${activeTab === 'description' ? 'border-[#1a7935] text-[#1a7935]' : 'border-transparent text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                Description
                            </button>
                            <button
                                onClick={() => setActiveTab('farmer')}
                                className={`pb-4 font-bold text-sm uppercase tracking-wide transition-colors border-b-2 ${activeTab === 'farmer' ? 'border-[#1a7935] text-[#1a7935]' : 'border-transparent text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                Farmer Details
                            </button>
                            <button
                                onClick={() => setActiveTab('reviews')}
                                className={`pb-4 font-bold text-sm uppercase tracking-wide transition-colors border-b-2 ${activeTab === 'reviews' ? 'border-[#1a7935] text-[#1a7935]' : 'border-transparent text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                Reviews ({reviews.length > 0 ? reviews.length : (product.rating ? '1+' : '0')})
                            </button>
                        </div>

                        <div className="min-h-[100px]">
                            {activeTab === 'description' && (
                                <div className="prose max-w-none text-gray-600 leading-relaxed animate-fade-in">
                                    <p>{product.description}</p>
                                    <p className="mt-4">
                                        This product is harvested directly from local farms ensuring maximum freshness and quality.
                                        Support local agriculture by purchasing via AgroLink.
                                    </p>
                                </div>
                            )}

                            {activeTab === 'farmer' && (
                                <div className="flex items-center gap-6 animate-fade-in">
                                    <div className="w-16 h-16 rounded-full bg-[#1a7935] text-white flex items-center justify-center text-2xl font-bold">
                                        <User className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-gray-900">{product.farmer?.fullName || 'Registered Farmer'}</h4>
                                        <p className="text-gray-500 text-sm">Member since {new Date(product.farmer?.createdAt || Date.now()).getFullYear()}</p>
                                        <div className="flex items-center gap-2 mt-2 text-sm text-[#1a7935] bg-green-50 px-3 py-1 rounded-full w-fit">
                                            <ShieldCheck className="h-3 w-3" />
                                            Verified Seller
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'reviews' && (
                                <div className="space-y-6 animate-fade-in">
                                    {loadingReviews ? (
                                        <div className="flex justify-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1a7935] border-t-transparent"></div>
                                        </div>
                                    ) : reviews.length === 0 ? (
                                        <div className="text-center py-8 bg-white rounded-xl border border-gray-100">
                                            <Star className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500 font-medium">No reviews yet for this product.</p>
                                            <p className="text-sm text-gray-400 mt-1">Purchase to be the first to review!</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {reviews.map(review => (
                                                <div key={review.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm relative">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">
                                                                {review.reviewer?.fullName?.charAt(0) || 'U'}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-sm text-gray-800">{review.reviewer?.fullName || 'Anonymous'}</p>
                                                                <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center text-yellow-500">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-700 text-sm leading-relaxed">
                                                        {review.comment || <span className="text-gray-400 italic">No written feedback provided.</span>}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
