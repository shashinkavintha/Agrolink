import React from 'react';
import SupplierProductManager from '../../components/supplier/SupplierProductManager';
import { Store, Package, Clock } from 'lucide-react';

export default function SupplierDashboard() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Supplier Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">My Products</p>
                        <h3 className="text-2xl font-bold text-gray-800 mt-1">Manage</h3>
                    </div>
                    <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-green-600" />
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
                        <h3 className="text-2xl font-bold text-gray-800 mt-1">Status</h3>
                    </div>
                    <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <Clock className="h-6 w-6 text-orange-600" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Farmers Shop</p>
                        <h3 className="text-2xl font-bold text-gray-800 mt-1">Active</h3>
                    </div>
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Store className="h-6 w-6 text-blue-600" />
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <SupplierProductManager />
            </div>
        </div>
    );
}
