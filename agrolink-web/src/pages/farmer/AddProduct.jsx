import React, { useState } from 'react';
import axios from 'axios';
import { supabase } from '../../lib/supabaseClient';
import { Loader2, Plus, Upload } from 'lucide-react';

// Categories in Sinhala/English
const categories = [
    { id: 1, name: 'Vegetables / එළවළු', type: 'vegetable' },
    { id: 2, name: 'Fruits / පළතුරු', type: 'fruit' },
    { id: 3, name: 'Spices / කුළුබඩු', type: 'spice' },
    { id: 4, name: 'Grains / ධාන්‍ය', type: 'grain' },
];

const cropTypes = {
    vegetable: ['Carrot', 'Leeks', 'Beans', 'Cabbage', 'Tomato', 'Brinjal', 'Pumpkin'],
    fruit: ['Banana', 'Papaya', 'Mango', 'Pineapple', 'Watermelon'],
    spice: ['Cinnamon', 'Pepper', 'Cardamom', 'Clove'],
    grain: ['Rice', 'Corn', 'Mung Bean']
};

// --- CONTENT CLEANSING (Section 5.1 DSR) ---
const checkMagicNumbers = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = (e) => {
            const arr = (new Uint8Array(e.target.result)).subarray(0, 12);
            let header = "";
            for (let i = 0; i < arr.length; i++) {
                header += arr[i].toString(16).padStart(2, '0');
            }
            // Magic Number Check:
            // JPEG: ffd8ffe0, ffd8ffe1
            // PNG: 89504e47
            // WebP (RIFF....WEBP): 52494646....57454250
            const isJpeg = header.startsWith('ffd8');
            const isPng = header.startsWith('89504e47');
            const isWebP = header.startsWith('52494646') && header.includes('57454250');
            
            resolve(isJpeg || isPng || isWebP);
        };
        reader.readAsArrayBuffer(file.slice(0, 12));
    });
};
// -------------------------------------------

export default function AddProduct() {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        category_id: '',
        product_name: '',
        description: '', // Init description
        price: '',
        unit: 'kg', // default
        quantity: '',
    });

    const [availableCrops, setAvailableCrops] = useState([]);

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = React.useRef(null);

    const handleImageClick = () => {
        fileInputRef.current.click();
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate Size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert("File size exceeds 5MB limit.");
                return;
            }

            // --- SEVERE CONTENT VALIDATION (Section 5.1 DSR) ---
            const isValidHeader = await checkMagicNumbers(file);
            if (!isValidHeader) {
                alert("STRICT SECURITY VIOLATION: Malformed file detected. Only legitimate WebP, PNG, or JPG images are allowed.");
                return;
            }
            // ----------------------------------------------------

            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCategoryChange = (e) => {
        const catId = e.target.value;
        const category = categories.find(c => c.id == catId);

        setFormData({ ...formData, category_id: catId, product_name: '' });

        if (category) {
            setAvailableCrops(cropTypes[category.type] || []);
        } else {
            setAvailableCrops([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert("Please login first");
                return;
            }

            let imageUrl = null;

            // Upload Image to Supabase Storage if file selected
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const filePath = `products/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(filePath, imageFile);

                if (uploadError) {
                    throw uploadError;
                }

                // Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(filePath);

                imageUrl = publicUrl;
            }

            // Prepare Payload for Backend
            // We need to fetch the farmer's profile UUID first or send user.id if backend handles it
            // Assuming backend expects a farmer object or farmer ID. 
            // Based on backend Profile entity, ID is the same as Auth ID usually in this setup.

            const payload = {
                farmerId: user.id,
                category: { id: formData.category_id },
                name: formData.product_name,
                description: formData.description, // Use custom description
                price: parseFloat(formData.price),
                quantity: parseFloat(formData.quantity),
                unit: formData.unit,
                imageUrl: imageUrl,
                status: 'pending' // Explicitly setting status
            };

            await axios.post('/api/products', payload);

            alert("Product Added Successfully! It will be listed after Admin approval.");
            setFormData({ category_id: '', product_name: '', description: '', price: '', unit: 'kg', quantity: '' });
            setAvailableCrops([]);
            setImageFile(null);
            setImagePreview(null);

        } catch (err) {
            console.error(err);
            alert("Error adding product. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <Plus className="bg-[#1a7935] text-white rounded-full p-1 mr-2" />
                    Add New Product / නව අස්වැන්නක් එකතු කරන්න
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Category Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category / වර්ගය</label>
                        <select
                            name="category_id"
                            value={formData.category_id}
                            onChange={handleCategoryChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#1a7935] focus:border-[#1a7935] bg-white"
                        >
                            <option value="">Select Category / තෝරන්න...</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Product Name & Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Product Title / මාතෘකාව</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                name="product_name"
                                value={formData.product_name}
                                onChange={handleChange}
                                required
                                placeholder="ex: Fresh Organic Carrots"
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#1a7935] focus:border-[#1a7935]"
                            />
                            {/* Quick Select Helper */}
                            <select
                                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                                disabled={!formData.category_id}
                                className="w-1/3 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-[#1a7935] focus:border-[#1a7935]"
                                value=""
                            >
                                <option value="" disabled>Quick Select...</option>
                                {availableCrops.map(crop => (
                                    <option key={crop} value={crop}>{crop}</option>
                                ))}
                            </select>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Select a common crop or type your own title.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description / විස්තරය</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            required
                            rows="3"
                            placeholder="Describe your harvest..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#1a7935] focus:border-[#1a7935]"
                        ></textarea>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Quantity */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity / ප්‍රමාණය</label>
                            <div className="flex">
                                <input
                                    type="number"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleChange}
                                    required
                                    placeholder="ex: 100"
                                    className="flex-1 px-4 py-2 border border-r-0 border-gray-300 rounded-l-lg focus:ring-[#1a7935] focus:border-[#1a7935]"
                                />
                                <select
                                    name="unit"
                                    value={formData.unit}
                                    onChange={handleChange}
                                    className="px-3 py-2 border border-gray-300 rounded-r-lg bg-gray-50 text-gray-600 focus:outline-none"
                                >
                                    <option value="kg">kg</option>
                                    <option value="g">g</option>
                                    <option value="pcs">pcs</option>
                                </select>
                            </div>
                        </div>

                        {/* Price */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price / ඒකකයක මිල (Rs)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 sm:text-sm">Rs.</span>
                                </div>
                                <input
                                    type="number"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleChange}
                                    required
                                    placeholder="0.00"
                                    className="w-full pl-12 px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#1a7935] focus:border-[#1a7935]"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Product Photo / ඡායාරූපය</label>

                        {/* Hidden File Input */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            className="hidden"
                        />

                        <div
                            onClick={handleImageClick}
                            className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-[#1a7935] cursor-pointer relative overflow-hidden"
                        >
                            {imagePreview ? (
                                <div className="relative w-full h-48">
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setImageFile(null);
                                            setImagePreview(null);
                                        }}
                                        className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full text-xs m-1"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-1 text-center">
                                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                    <p className="text-sm text-gray-500">Click to upload image</p>
                                    <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#1a7935] hover:bg-[#145d29] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a7935] disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Add Product / ඇතුළත් කරන්න'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
