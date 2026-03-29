import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, TrendingUp, AlertCircle, CheckCircle, Star, RefreshCcw, Info } from 'lucide-react';

export default function SellerKPIs() {
    const [farmers, setFarmers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recalculating, setRecalculating] = useState(null);

    const fetchFarmers = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/profiles/farmers');
            // Sort by Bayesian Average by default
            const sorted = res.data.sort((a, b) => (b.bayesianAverage || 0) - (a.bayesianAverage || 0));
            setFarmers(sorted);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFarmers();
    }, []);

    const handleRecalculate = async (id) => {
        setRecalculating(id);
        try {
            await axios.post(`/api/profiles/${id}/recalculate-ranks`);
            await fetchFarmers();
        } catch (err) {
            alert('Error recalculating ranks');
        } finally {
            setRecalculating(null);
        }
    };

    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-[#1a7935]" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Seller Performance & KPIs</h1>
                    <p className="text-gray-500 text-sm mt-1">Monitoring "Top Seller" standards and ranking algorithms.</p>
                </div>
                <div className="flex space-x-2">
                     <div className="flex items-center text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                        <Info className="h-3 w-3 mr-1" />
                        Rolling 30-day window
                     </div>
                </div>
            </div>

            {/* KPI Standards Legend */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertCircle className="h-5 w-5" /></div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Order Defect Rate</p>
                        <p className="text-sm font-semibold">Target: &lt; 1%</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><TrendingUp className="h-5 w-5" /></div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Late Shipment Rate</p>
                        <p className="text-sm font-semibold">Target: &lt; 4%</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><CheckCircle className="h-5 w-5" /></div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Cancellation Rate</p>
                        <p className="text-sm font-semibold">Target: &lt; 2.5%</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wilson / Bayesian</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ODR</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Late Ship</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pre-Fill Cancel</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {farmers.map((farmer) => (
                            <tr key={farmer.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 relative">
                                            <div className="h-full w-full bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-sm font-bold">
                                                {farmer.fullName?.charAt(0)}
                                            </div>
                                            {farmer.isTopSeller && (
                                                <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 border-2 border-white">
                                                    <Star className="h-2 w-2 text-white fill-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{farmer.fullName}</div>
                                            <div className="text-xs text-gray-500">{farmer.totalOrders || 0} Total Orders</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-indigo-600">{farmer.wilsonScore?.toFixed(3)}</span>
                                        <span className="text-xs text-gray-400">Bayesian: {farmer.bayesianAverage?.toFixed(1)}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`text-sm font-medium ${farmer.orderDefectRate > 1.0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {farmer.orderDefectRate?.toFixed(1)}%
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`text-sm font-medium ${farmer.lateShipmentRate > 4.0 ? 'text-orange-600' : 'text-green-600'}`}>
                                        {farmer.lateShipmentRate?.toFixed(1)}%
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`text-sm font-medium ${farmer.preFulfillmentCancellationRate > 2.5 ? 'text-red-600' : 'text-green-600'}`}>
                                        {farmer.preFulfillmentCancellationRate?.toFixed(1)}%
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {farmer.isTopSeller ? (
                                        <span className="px-2 py-1 text-[10px] bg-yellow-100 text-yellow-700 rounded-full font-bold uppercase">Top Seller</span>
                                    ) : (
                                        <span className="px-2 py-1 text-[10px] bg-gray-100 text-gray-500 rounded-full font-bold uppercase">Standard</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                    <button 
                                        onClick={() => handleRecalculate(farmer.id)}
                                        disabled={recalculating === farmer.id}
                                        className="text-gray-400 hover:text-[#1a7935] transition-colors disabled:opacity-50"
                                        title="Recalculate Now"
                                    >
                                        <RefreshCcw className={`h-4 w-4 ${recalculating === farmer.id ? 'animate-spin' : ''}`} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
