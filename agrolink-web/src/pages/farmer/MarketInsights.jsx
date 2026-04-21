import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, Cloud, Thermometer, Droplets, MapPin, Calendar, Info, Loader2 } from 'lucide-react';

export default function MarketInsights() {
    const [metadata, setMetadata] = useState({ regions: [], commodities: [] });
    const [loading, setLoading] = useState(true);
    const [predicting, setPredicting] = useState(false);
    const [prediction, setPrediction] = useState(null);
    
    const [formData, setFormData] = useState({
        commodity: '',
        region: '',
        month: new Date().getMonth() + 1,
        temperature: 30,
        rainfall: 100,
        humidity: 75,
        yield_score: 1.5
    });

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                // Assuming AI service runs on same host but port 5001
                const res = await axios.get('http://localhost:5001/metadata');
                setMetadata(res.data);
                if (res.data.commodities.length > 0) {
                    setFormData(prev => ({ 
                        ...prev, 
                        commodity: res.data.commodities[0],
                        region: res.data.regions[0] 
                    }));
                }
            } catch (err) {
                console.error("Failed to fetch AI metadata", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMetadata();
    }, []);

    const handlePredict = async (e) => {
        e.preventDefault();
        setPredicting(true);
        try {
            const res = await axios.post('http://localhost:5001/predict', formData);
            setPrediction(res.data);
        } catch (err) {
            console.error("Prediction failed", err);
            alert("Model prediction failed. Make sure the AI service is running.");
        } finally {
            setPredicting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#1a7935]" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-green-100 rounded-2xl">
                        <TrendingUp className="h-6 w-6 text-[#1a7935]" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">AI Market Price Predictor</h2>
                        <p className="text-gray-500">Predict crop prices based on climate patterns and regional data</p>
                    </div>
                </div>

                <form onSubmit={handlePredict} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Target Month
                        </label>
                        <select 
                            className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#1a7935] outline-none"
                            value={formData.month}
                            onChange={e => setFormData({...formData, month: parseInt(e.target.value)})}
                        >
                            {Array.from({length: 12}, (_, i) => (
                                <option key={i+1} value={i+1}>
                                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <MapPin className="h-4 w-4" /> Region
                        </label>
                        <select 
                            className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#1a7935] outline-none"
                            value={formData.region}
                            onChange={e => setFormData({...formData, region: e.target.value})}
                        >
                            {metadata.regions.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Crop Type / බෝග වර්ගය
                        </label>
                        <select 
                            className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#1a7935] outline-none cursor-pointer"
                            value={formData.commodity}
                            onChange={e => setFormData({...formData, commodity: e.target.value})}
                        >
                            <option value="">-- Select Crop --</option>
                            {metadata.commodities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Thermometer className="h-4 w-4" /> Avg Temperature (°C)
                        </label>
                        <input 
                            type="number"
                            className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#1a7935] outline-none"
                            value={formData.temperature}
                            onChange={e => setFormData({...formData, temperature: parseFloat(e.target.value)})}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Cloud className="h-4 w-4" /> Rainfall (mm)
                        </label>
                        <input 
                            type="number"
                            className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#1a7935] outline-none"
                            value={formData.rainfall}
                            onChange={e => setFormData({...formData, rainfall: parseFloat(e.target.value)})}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Droplets className="h-4 w-4" /> Humidity (%)
                        </label>
                        <input 
                            type="number"
                            className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#1a7935] outline-none"
                            value={formData.humidity}
                            onChange={e => setFormData({...formData, humidity: parseFloat(e.target.value)})}
                        />
                    </div>

                    <div className="md:col-span-2 lg:col-span-3 pt-4">
                        <button 
                            type="submit"
                            disabled={predicting}
                            className="w-full py-4 bg-[#1a7935] text-white rounded-2xl font-bold shadow-lg shadow-green-100 hover:bg-[#145d29] transition-all flex items-center justify-center gap-2"
                        >
                            {predicting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Generate Price Prediction"}
                        </button>
                    </div>
                </form>
            </div>

            {prediction && (
                <div className="bg-gradient-to-br from-[#1a7935] to-[#145d29] p-8 rounded-3xl text-white shadow-xl animate-in slide-in-from-bottom-5 duration-500">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="space-y-2">
                            <p className="text-green-200 font-bold uppercase tracking-wider text-sm">Predicted Market Price</p>
                            <h3 className="text-5xl font-black">
                                Rs. {prediction.predicted_price}
                                <span className="text-xl font-normal opacity-70 ml-2">/ {prediction.unit}</span>
                            </h3>
                            <p className="text-green-100/70 text-sm italic">
                                * Based on {formData.commodity} in {formData.region} for {new Date(0, formData.month-1).toLocaleString('default', { month: 'long' })}
                            </p>
                        </div>
                        
                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 flex items-start gap-4 max-w-sm">
                            <Info className="h-6 w-6 text-green-200 flex-shrink-0" />
                            <p className="text-sm leading-relaxed text-green-50">
                                This prediction is generated by our AI model trained on Sri Lankan agricultural climate data (99.3% accuracy on historical sets). Always consider local variations.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
