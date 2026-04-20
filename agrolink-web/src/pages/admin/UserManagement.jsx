import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Ban, CheckCircle, Search, Filter } from 'lucide-react';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/profiles/all');
            setUsers(response.data || []);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleBanUser = async (userId) => {
        if (!window.confirm("Are you sure you want to ban this user? They will not be able to access the platform.")) return;
        try {
            await axios.put(`/api/profiles/${userId}/ban`);
            setUsers(users.map(u => u.id === userId ? { ...u, status: 'banned' } : u));
        } catch (error) {
            alert("Failed to ban user.");
            console.error(error);
        }
    };

    const handleActivateUser = async (userId) => {
        if (!window.confirm("Are you sure you want to activate/un-ban this user?")) return;
        try {
            await axios.put(`/api/profiles/${userId}/activate`);
            setUsers(users.map(u => u.id === userId ? { ...u, status: 'approved' } : u));
        } catch (error) {
            alert("Failed to activate user.");
            console.error(error);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || user.role === filterRole;
        return matchesSearch && matchesRole;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'banned': return 'bg-red-100 text-red-800';
            case 'pending':
            case 'submitted': return 'bg-yellow-100 text-yellow-800';
            case 'rejected': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2815]"
                    />
                </div>
                <div className="flex items-center space-x-2 w-full md:w-auto">
                    <Filter className="h-5 w-5 text-gray-500" />
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-[#0f2815] focus:border-[#0f2815] block w-full p-2.5"
                    >
                        <option value="all">All Roles</option>
                        <option value="buyer">Buyers</option>
                        <option value="farmer">Farmers</option>
                        <option value="driver">Drivers</option>
                        <option value="supplier">Suppliers</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a7935]"></div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold overflow-hidden">
                                                    {user.avatarUrl ? (
                                                        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        user.fullName?.charAt(0) || 'U'
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{user.fullName || 'Unknown'}</div>
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getStatusColor(user.status)}`}>
                                                {user.status || 'pending'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {user.status !== 'banned' ? (
                                                <button
                                                    onClick={() => handleBanUser(user.id)}
                                                    className="text-red-600 hover:text-red-900 flex items-center justify-end w-full"
                                                >
                                                    <Ban className="h-4 w-4 mr-1" /> Ban User
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleActivateUser(user.id)}
                                                    className="text-green-600 hover:text-green-900 flex items-center justify-end w-full"
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-1" /> Activate
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                            No users found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
