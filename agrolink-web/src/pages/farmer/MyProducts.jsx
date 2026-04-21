import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../../lib/supabaseClient';
import { 
    Loader2, 
    Edit, 
    Trash2, 
    AlertCircle, 
    CheckCircle2, 
    Clock, 
    XCircle,
    Package,
    Search,
    Filter,
    PlusCircle,
    MinusCircle
} from 'lucide-react';

const categories = [
    { id: 1, name: 'Vegetables / එළවළු' },
    { id: 2, name: 'Fruits / පළතුරු' },
    { id: 3, name: 'Spices / කුළුබඩු' },
    { id: 4, name: 'Grains / ධාන්‍ය' },
];

export default function MyProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [editFormData, setEditFormData] = useState({
        price: '',
        quantity: '',
        description: '',
        status: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Quick Stock Update State
    const [updatingStockId, setUpdatingStockId] = useState(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError("Please login to see your products.");
                setLoading(false);
                return;
            }

            const response = await axios.get(`/api/products/farmer/${user.id}`);
            setProducts(response.data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError("Failed to load products. Check your connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;

        try {
            await axios.delete(`/api/products/${id}`);
            setProducts(products.filter(p => p.id !== id));
            alert("Product deleted successfully.");
        } catch (err) {
            console.error(err);
            alert("Failed to delete product.");
        }
    };

    const openEditModal = (product) => {
        setEditingProduct(product);
        setEditFormData({
            price: product.price,
            quantity: product.quantity,
            description: product.description || '',
            status: product.status
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const updatedProduct = {
                ...editingProduct,
                price: parseFloat(editFormData.price),
                quantity: parseFloat(editFormData.quantity),
                description: editFormData.description,
                // Status resets to pending if important fields change? 
                // For now keep it as is, or admin might need to re-approve
                status: 'pending' 
            };

            await axios.put(`/api/products/${editingProduct.id}`, updatedProduct);
            
            // Refresh list
            await fetchProducts();
            setIsEditModalOpen(false);
            setEditingProduct(null);
            alert("Product updated successfully and sent for review.");
        } catch (err) {
            console.error(err);
            alert("Failed to update product.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleQuickStockUpdate = async (product, newQuantity) => {
        if (newQuantity < 0) return;
        setUpdatingStockId(product.id);
        try {
            const updatedProduct = { ...product, quantity: newQuantity };
            await axios.put(`/api/products/${product.id}`, updatedProduct);
            setProducts(products.map(p => p.id === product.id ? { ...p, quantity: newQuantity } : p));
        } catch (err) {
            console.error(err);
            alert("Failed to update stock.");
        } finally {
            setUpdatingStockId(null);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'pending': return <Clock className="w-4 h-4 text-amber-500" />;
            case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
            default: return <Clock className="w-4 h-4 text-gray-500" />;
        }
    };

    const getStatusBadge = (status) => {
        const base = "px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ";
        switch (status) {
            case 'approved': return <span className={base + "bg-green-100 text-green-700"}>{getStatusIcon(status)} Approved</span>;
            case 'pending': return <span className={base + "bg-amber-100 text-amber-700"}>{getStatusIcon(status)} Pending</span>;
            case 'rejected': return <span className={base + "bg-red-100 text-red-700"}>{getStatusIcon(status)} Rejected</span>;
            default: return <span className={base + "bg-gray-100 text-gray-700"}>{getStatusIcon(status)} {status}</span>;
        }
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'all' || p.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">My Products / මගේ අස්වැන්න</h1>
                    <p className="text-gray-500">Manage and track your listed products</p>
                </div>
                
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Search products..."
                            className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a7935] focus:border-transparent outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <select 
                            className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-[#1a7935] outline-none appearance-none"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-10 h-10 animate-spin text-[#1a7935]" />
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-100 p-6 rounded-xl flex items-center gap-4 text-red-700">
                    <AlertCircle className="w-8 h-8 flex-shrink-0" />
                    <div>
                        <p className="font-bold">Error Loading Products</p>
                        <p className="text-sm">{error}</p>
                        <button onClick={fetchProducts} className="mt-2 text-sm underline font-semibold">Try Again</button>
                    </div>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center">
                    <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-700">No products found</h3>
                    <p className="text-gray-500 mb-6 font-medium">You haven't listed any products yet or no matches found.</p>
                    <a href="/farmer/add-product" className="inline-flex items-center px-6 py-3 bg-[#1a7935] text-white rounded-xl font-bold hover:bg-[#145d29] transition-all shadow-md active:scale-95">
                        Add New Product
                    </a>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map((product) => (
                        <div key={product.id} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:border-green-100 transition-all duration-300 transform hover:-translate-y-1">
                            <div className="relative h-48 bg-gray-100">
                                {product.imageUrl ? (
                                    <img 
                                        src={product.imageUrl} 
                                        alt={product.name} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <Package className="w-12 h-12" />
                                    </div>
                                )}
                                <div className="absolute top-3 left-3">
                                    {getStatusBadge(product.status)}
                                </div>
                            </div>
                            
                            <div className="p-5">
                                <h3 className="text-lg font-bold text-gray-800 mb-1 truncate">{product.name}</h3>
                                <p className="text-xs text-[#1a7935] font-bold mb-3 uppercase tracking-wider">{product.category?.name || 'Category'}</p>
                                
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-xs text-gray-400 font-medium">Price / මිල</p>
                                        <p className="text-xl font-black text-gray-900">
                                            Rs. {product.price}
                                            <span className="text-xs text-gray-500 font-bold ml-1">/{product.unit}</span>
                                        </p>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <p className="text-xs text-gray-400 font-medium text-right mb-1">Available / තොගය</p>
                                        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
                                            <button 
                                                onClick={() => handleQuickStockUpdate(product, product.quantity - 10)}
                                                disabled={updatingStockId === product.id}
                                                className="text-gray-500 hover:text-red-500 disabled:opacity-50"
                                            >
                                                <MinusCircle className="w-5 h-5" />
                                            </button>
                                            <span className="text-lg font-bold text-gray-800 min-w-[3rem] text-center">
                                                {updatingStockId === product.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto"/> : product.quantity}
                                            </span>
                                            <button 
                                                onClick={() => handleQuickStockUpdate(product, product.quantity + 10)}
                                                disabled={updatingStockId === product.id}
                                                className="text-gray-500 hover:text-green-600 disabled:opacity-50"
                                            >
                                                <PlusCircle className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <span className="text-xs text-gray-500 font-bold mt-1">{product.unit}</span>
                                    </div>
                                </div>
                                
                                {product.quantity < 50 && (
                                    <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-2 text-red-600">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <p className="text-xs font-bold uppercase tracking-wider">Low Stock Warning!</p>
                                    </div>
                                )}

                                <div className="mt-4 pt-4 border-t border-gray-50 flex gap-3">
                                    <button 
                                        onClick={() => openEditModal(product)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-50 text-gray-700 rounded-xl font-bold hover:bg-[#1a7935] hover:text-white transition-all text-sm active:scale-95"
                                    >
                                        <Edit className="w-4 h-4" /> Edit
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(product.id)}
                                        className="w-12 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-95 translate-x-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="bg-[#1a7945] p-6 text-white relative">
                            <h2 className="text-xl font-extrabold">Update Product Details</h2>
                            <p className="text-green-100 text-sm">Editing: {editingProduct?.name}</p>
                            <button 
                                onClick={() => setIsEditModalOpen(false)}
                                className="absolute top-6 right-6 text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-colors"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleEditSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Price (Rs.)</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#1a7935] outline-none font-bold text-gray-700"
                                        value={editFormData.price}
                                        onChange={(e) => setEditFormData({...editFormData, price: e.target.value})}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Quantity ({editingProduct?.unit})</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#1a7935] outline-none font-bold text-gray-700"
                                        value={editFormData.quantity}
                                        onChange={(e) => setEditFormData({...editFormData, quantity: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Description / විස්තරය</label>
                                <textarea 
                                    rows="4"
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#1a7935] outline-none font-medium text-gray-700 resize-none"
                                    value={editFormData.description}
                                    onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                                    placeholder="Add more details about your harvest..."
                                ></textarea>
                            </div>

                            <p className="text-[10px] text-gray-400 font-bold uppercase leading-relaxed text-center">
                                * Note: Editing your product will instantaneously update it on the marketplace.
                            </p>
                            
                            <div className="flex gap-4 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submitting}
                                    className="flex-[2] py-4 bg-[#1a7935] text-white rounded-2xl font-black shadow-lg shadow-green-200 hover:bg-[#145d29] hover:shadow-xl transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
