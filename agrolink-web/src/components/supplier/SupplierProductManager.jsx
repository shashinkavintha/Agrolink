import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, X, Save, Search, Image as ImageIcon, Upload, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function SupplierProductManager() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        quantity: '',
        unit: 'Units',
        imageUrl: '',
        category: null,
        adminId: '',
        status: 'pending' // Default status for suppliers
    });

    useEffect(() => {
        getCurrentUserAndFetchData();
    }, []);

    const getCurrentUserAndFetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setCurrentUserId(user.id);
            fetchData(user.id);
        } else {
            setLoading(false);
        }
    };

    const fetchData = async (userId) => {
        try {
            const [prodRes, catRes] = await Promise.all([
                axios.get('/api/farmer-shop-products'),
                axios.get('/api/categories?type=FARMERS_SHOP')
            ]);
            // Only show products added by this supplier
            const supplierProducts = prodRes.data.filter(p => p.adminId === userId);
            setProducts(supplierProducts);
            setCategories(catRes.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        try {
            setUploading(true);
            const file = e.target.files[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            setFormData({ ...formData, imageUrl: data.publicUrl });
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Error uploading image!');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!currentUserId) {
                alert("Please wait for user to load or re-login.");
                return;
            }
            const payload = {
                adminId: currentUserId,
                name: formData.name,
                description: formData.description,
                price: parseFloat(formData.price),
                stockQuantity: parseInt(formData.quantity),
                unit: formData.unit,
                imageUrl: formData.imageUrl,
                category: formData.category ? formData.category.name : '',
                status: editingProduct ? editingProduct.status : 'pending' // Keep old status if editing, or set pending
            };

            if (editingProduct) {
                await axios.put(`/api/farmer-shop-products/${editingProduct.id}`, payload);
            } else {
                await axios.post('/api/farmer-shop-products', payload);
            }
            fetchData(currentUserId);
            handleCloseModal();
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Failed to save product. Check console for details.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await axios.delete(`/api/farmer-shop-products/${id}`);
                fetchData(currentUserId);
            } catch (error) {
                console.error('Error deleting product:', error);
            }
        }
    };

    const handleOpenModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                description: product.description || '',
                price: product.price,
                quantity: product.stockQuantity || product.quantity,
                unit: product.unit || 'Units',
                imageUrl: product.imageUrl,
                category: categories.find(c => c.name === product.category) || null,
                adminId: product.adminId,
                status: product.status
            });
        } else {
            setEditingProduct(null);
            setFormData({
                name: '',
                description: '',
                price: '',
                quantity: '',
                unit: 'Units',
                imageUrl: '',
                category: categories[0] || null,
                adminId: currentUserId || '',
                status: 'pending' // defaults to pending
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
            case 'available':
                return <span className="px-2 py-1 flex items-center gap-1 text-xs font-bold bg-green-100 text-green-800 rounded-full"><CheckCircle className="w-3 h-3" /> Approved</span>;
            case 'rejected':
                return <span className="px-2 py-1 flex items-center gap-1 text-xs font-bold bg-red-100 text-red-800 rounded-full"><XCircle className="w-3 h-3" /> Rejected</span>;
            case 'pending':
            default:
                return <span className="px-2 py-1 flex items-center gap-1 text-xs font-bold bg-orange-100 text-orange-800 rounded-full"><Clock className="w-3 h-3" /> Pending</span>;
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return <div className="text-center p-10"><div className="animate-spin h-8 w-8 border-4 border-b-[#1a7935] mx-auto rounded-full"></div></div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-lg font-bold text-gray-800">My Supplier Products</h2>
                <div className="flex w-full md:w-auto space-x-2">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a7935]"
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center space-x-2 px-4 py-2 bg-[#1a7935] text-white rounded-lg hover:bg-[#145e29] whitespace-nowrap"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add Product</span>
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="p-4 font-semibold text-gray-600">Product</th>
                            <th className="p-4 font-semibold text-gray-600">Category</th>
                            <th className="p-4 font-semibold text-gray-600">Price</th>
                            <th className="p-4 font-semibold text-gray-600">Stock</th>
                            <th className="p-4 font-semibold text-gray-600">Status</th>
                            <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-gray-500">No products found. Start adding products to supply.</td>
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
                                                    <div className="h-full w-full flex items-center justify-center text-gray-400">
                                                        <ImageIcon className="h-4 w-4" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800">{product.name}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-600">{product.category}</td>
                                    <td className="p-4 text-gray-600">LKR {product.price}</td>
                                    <td className="p-4 text-gray-600">{product.stockQuantity || product.quantity} {product.unit || 'Units'}</td>
                                    <td className="p-4">
                                        {getStatusBadge(product.status)}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => handleOpenModal(product)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
                            <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Form fields identical to AdminProductManager */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a7935]" required />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a7935]" rows="3" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price (LKR)</label>
                                <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a7935]" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                <input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a7935]" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                                <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a7935]">
                                    <option value="Units">Units</option>
                                    <option value="Packets">Packets</option>
                                    <option value="Bags">Bags</option>
                                    <option value="kg">kg</option>
                                    <option value="Liters">Liters</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select value={formData.category ? formData.category.id : ''} onChange={(e) => { const cat = categories.find(c => c.id === parseInt(e.target.value)); setFormData({ ...formData, category: cat }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a7935]" required>
                                    <option value="">Select Category</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                                <div className="flex items-center space-x-4">
                                    {formData.imageUrl && <div className="h-20 w-20 rounded-lg overflow-hidden bg-gray-100 border border-gray-200"><img src={formData.imageUrl} alt="Preview" className="h-full w-full object-cover" /></div>}
                                    <div className="flex-1">
                                        <label className="flex items-center justify-center w-full px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                            <div className="text-center">
                                                {uploading ? <span className="text-sm text-gray-500">Uploading...</span> : <div className="flex items-center space-x-2 text-gray-600"><Upload className="h-4 w-4" /><span className="text-sm">Click to upload image</span></div>}
                                            </div>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-2 pt-4">
                                <p className="text-xs text-orange-600 mb-3">* Your product will need Admin Approval before showing up in the Farmers Shop.</p>
                                <button type="submit" disabled={uploading} className="w-full bg-[#1a7935] text-white py-2 rounded-lg hover:bg-[#145e29] flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <Save className="h-4 w-4" /><span>{editingProduct ? 'Update Product' : 'Submit for Approval'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
