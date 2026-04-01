import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, Check, X, Tag, Trash2, EyeOff, Search, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function ProductReview() {
    const [pendingProducts, setPendingProducts] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pendingRes, allRes] = await Promise.all([
                axios.get('/api/products/pending'),
                axios.get('/api/products/all')
            ]);
            setPendingProducts(pendingRes.data);
            setAllProducts(allRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleStatusUpdate = async (id, status) => {
        if (!window.confirm(`Are you sure you want to ${status} this product?`)) return;
        try {
            await axios.put(`/api/products/${id}/status?status=${status}`);
            fetchData();
        } catch (err) {
            alert("Error updating product");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to permanently delete this product?")) return;
        try {
            await axios.delete(`/api/products/${id}`);
            fetchData();
        } catch (err) {
            alert("Error deleting product");
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved': return <span className="flex items-center w-fit gap-1 text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full font-bold"><CheckCircle className="w-3 h-3"/> Approved</span>;
            case 'rejected': return <span className="flex items-center w-fit gap-1 text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full font-bold"><XCircle className="w-3 h-3"/> Rejected (Hidden)</span>;
            case 'pending': default: return <span className="flex items-center w-fit gap-1 text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full font-bold"><Clock className="w-3 h-3"/> Pending</span>;
        }
    };

    const displayProducts = activeTab === 'pending' ? pendingProducts : allProducts;
    const filteredProducts = displayProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.category && p.category.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading && allProducts.length === 0) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-[#1a7935]" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Products Management</h1>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a7935]"
                    />
                </div>
            </div>

            <div className="flex space-x-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'pending' ? 'border-[#1a7935] text-[#1a7935]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Pending Approvals ({pendingProducts.length})
                </button>
                <button
                    onClick={() => setActiveTab('all')}
                    className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'all' ? 'border-[#1a7935] text-[#1a7935]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    All Products
                </button>
            </div>

            {activeTab === 'all' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-max">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-4 font-semibold text-gray-600">Product</th>
                                    <th className="p-4 font-semibold text-gray-600">Farmer ID</th>
                                    <th className="p-4 font-semibold text-gray-600">Price/Stock</th>
                                    <th className="p-4 font-semibold text-gray-600">Status</th>
                                    <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-gray-500">No products found.</td>
                                    </tr>
                                ) : (
                                    filteredProducts.map((product) => (
                                        <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="p-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="h-10 w-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                                        {product.imageUrl ? (
                                                            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center text-gray-400 text-[10px] font-medium uppercase text-center leading-tight tracking-tighter">No<br/>Img</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-800">{product.name}</p>
                                                        <p className="text-xs text-gray-500">{product.category ? (product.category.name || product.category) : 'Unknown'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-xs text-gray-500 font-mono">
                                                {product.farmerId && product.farmerId.substring(0, 8)}...
                                            </td>
                                            <td className="p-4 text-sm text-gray-600">
                                                <span className="font-semibold text-gray-800">Rs. {product.price}</span> <br/>
                                                <span className="text-xs text-gray-500">Qty: {product.quantity} {product.unit}</span>
                                            </td>
                                            <td className="p-4">
                                                {getStatusBadge(product.status)}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end space-x-2">
                                                    {product.status !== 'rejected' && (
                                                        <button onClick={() => handleStatusUpdate(product.id, 'rejected')} className="px-2 py-1.5 bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 rounded-md flex items-center gap-1 text-xs font-semibold" title="Hide from marketplace">
                                                            <EyeOff className="h-4 w-4" /> <span className="hidden sm:inline">Hide</span>
                                                        </button>
                                                    )}
                                                    {product.status !== 'approved' && (
                                                        <button onClick={() => handleStatusUpdate(product.id, 'approved')} className="px-2 py-1.5 bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 rounded-md flex items-center gap-1 text-xs font-semibold" title="Approve">
                                                            <CheckCircle className="h-4 w-4" /> <span className="hidden sm:inline">Approve</span>
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDelete(product.id)} className="px-2 py-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-md flex items-center gap-1 text-xs font-semibold" title="Delete Product">
                                                        <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'pending' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.length === 0 ? (
                        <div className="col-span-full text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
                            <p className="text-gray-500">No pending products to review.</p>
                        </div>
                    ) : (
                        filteredProducts.map((product) => (
                            <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                                <div className="h-48 bg-gray-100 relative">
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                                    )}
                                    <div className="absolute top-2 right-2">
                                        {getStatusBadge('pending')}
                                    </div>
                                </div>
                                <div className="p-4 flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg text-gray-900">{product.name}</h3>
                                        <span className="text-[#1a7935] font-bold">Rs. {product.price}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-500 mb-2">
                                        <Tag className="h-4 w-4 mr-1" />
                                        {product.category ? (product.category.name || product.category) : 'Unknown Category'}
                                    </div>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Qty: {product.quantity} {product.unit} <br />
                                        Farmer ID: {product.farmerId && product.farmerId.substring(0, 8)}...
                                    </p>
                                </div>
                                <div className="p-4 bg-gray-50 border-t border-gray-100 flex space-x-2">
                                    <button
                                        onClick={() => handleStatusUpdate(product.id, 'approved')}
                                        className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center"
                                    >
                                        <Check className="h-4 w-4 mr-1" /> Approve
                                    </button>
                                    <button
                                        onClick={() => handleStatusUpdate(product.id, 'rejected')}
                                        className="flex-1 bg-red-100 text-red-700 py-2 rounded-lg text-sm font-medium hover:bg-red-200 flex items-center justify-center"
                                    >
                                        <X className="h-4 w-4 mr-1" /> Reject
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
