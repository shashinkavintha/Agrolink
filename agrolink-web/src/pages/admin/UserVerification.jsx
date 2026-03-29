import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Check, X, Eye, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function UserVerification() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);

    const fetchPendingUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/profiles/pending');
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingUsers();
    }, []);

    const getSignedUrl = async (fullUrl) => {
        if (!fullUrl) return null;
        try {
            // In case fullUrl is not a string for some reason
            if (typeof fullUrl !== 'string') {
                console.warn("Invalid URL format:", fullUrl);
                return null;
            }

            // Check if it's already a signed URL or doesn't match our bucket pattern
            if (!fullUrl.includes('/verification_docs/')) return fullUrl;

            // Extract path from URL. 
            // URL format example: https://.../storage/v1/object/public/verification_docs/path/to/file
            // We need: path/to/file
            // handle cases where url might have query params
            const cleanUrl = fullUrl.split('?')[0];
            const pathParts = cleanUrl.split('/verification_docs/');

            if (pathParts.length < 2) return fullUrl;

            let path = decodeURIComponent(pathParts[1]); // Decode in case of encoded chars

            // Remove leading slash if present
            if (path.startsWith('/')) {
                path = path.substring(1);
            }

            console.log(`Signing URL for path: '${path}' extracted from '${fullUrl}'`);

            const { data, error } = await supabase
                .storage
                .from('verification_docs')
                .createSignedUrl(path, 3600); // Valid for 1 hour

            if (error) {
                console.warn('Error signing URL:', error.message);
                // Fallback to the original URL. If the bucket is public, this will work.
                return fullUrl;
            }
            return data.signedUrl;
        } catch (e) {
            console.warn('Error extracting path:', e);
            // Fallback to original URL
            return fullUrl;
        }
    };

    const handleReview = async (user) => {
        console.log("Reviewing user full object:", user);
        console.log("Vehicle Photo URL:", user.vehiclePhotoUrl);
        console.log("Vehicle Plate Photo URL:", user.vehiclePlatePhotoUrl);

        // Fetch signed URLs for all docs
        const nicFrontSigned = await getSignedUrl(user.nicFrontUrl);
        const nicBackSigned = await getSignedUrl(user.nicBackUrl);
        const proofSigned = await getSignedUrl(user.proofPhotoUrl);

        let vehiclePhotoSigned = null;
        let vehiclePlatePhotoSigned = null;

        if (user.role === 'driver') {
            vehiclePhotoSigned = await getSignedUrl(user.vehiclePhotoUrl);
            vehiclePlatePhotoSigned = await getSignedUrl(user.vehiclePlatePhotoUrl);
        }

        setSelectedUser({
            ...user,
            nicFrontDetail: nicFrontSigned,
            nicBackDetail: nicBackSigned,
            proofPhotoDetail: proofSigned,
            vehiclePhotoDetail: vehiclePhotoSigned,
            vehiclePlatePhotoDetail: vehiclePlatePhotoSigned
        });
    };

    const handleApprove = async (id) => {
        try {
            await axios.put(`/api/profiles/${id}/approve`);
            setUsers(users.filter(u => u.id !== id));
            setSelectedUser(null);
        } catch (err) {
            alert('Error approving user');
        }
    };

    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-[#1a7935]" /></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">User Verification Queue</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                    No pending verifications found.
                                </td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-sm font-bold">
                                                {user.fullName ? user.fullName.charAt(0) : '?'}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{user.fullName || 'Unknown'}</div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                     ${user.role === 'farmer' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.status === 'submitted' ? (
                                            <span className="text-orange-600 font-bold flex items-center">
                                                <Check className="h-3 w-3 mr-1" /> Submitted
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">Pending Docs</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleReview(user)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                        >
                                            Review
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Review Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedUser(null)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
                                            Review Applicant: {selectedUser.fullName}
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                            <div>
                                                <p className="text-sm font-medium text-gray-500 mb-2">NIC Front</p>
                                                {selectedUser.nicFrontDetail ? (
                                                    <a href={selectedUser.nicFrontDetail} target="_blank" rel="noopener noreferrer">
                                                        <img src={selectedUser.nicFrontDetail} alt="NIC Front" className="w-full h-48 object-cover rounded-lg border hover:opacity-90 transition-opacity" />
                                                    </a>
                                                ) : <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">Not Uploaded or Private</div>}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-500 mb-2">NIC Back</p>
                                                {selectedUser.nicBackDetail ? (
                                                    <a href={selectedUser.nicBackDetail} target="_blank" rel="noopener noreferrer">
                                                        <img src={selectedUser.nicBackDetail} alt="NIC Back" className="w-full h-48 object-cover rounded-lg border hover:opacity-90 transition-opacity" />
                                                    </a>
                                                ) : <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">Not Uploaded or Private</div>}
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <p className="text-sm font-medium text-gray-500 mb-2">Proof Photo (Selfie)</p>
                                            {selectedUser.proofPhotoDetail ? (
                                                <a href={selectedUser.proofPhotoDetail} target="_blank" rel="noopener noreferrer">
                                                    <img src={selectedUser.proofPhotoDetail} alt="Proof" className="w-48 h-48 object-cover rounded-lg border mx-auto hover:opacity-90 transition-opacity" />
                                                </a>
                                            ) : <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">Not Uploaded or Private</div>}
                                        </div>

                                        {/* Driver Vehicle Photos */}
                                        {selectedUser.role === 'driver' && (
                                            <div className="border-t border-gray-100 pt-6">
                                                <h4 className="text-md font-bold text-gray-800 mb-4">Vehicle Details</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-500 mb-2">Vehicle Photo</p>
                                                        {selectedUser.vehiclePhotoDetail ? (
                                                            <a href={selectedUser.vehiclePhotoDetail} target="_blank" rel="noopener noreferrer">
                                                                <img src={selectedUser.vehiclePhotoDetail} alt="Vehicle" className="w-full h-48 object-cover rounded-lg border hover:opacity-90 transition-opacity" />
                                                            </a>
                                                        ) : <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">Not Uploaded</div>}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-500 mb-2">Number Plate</p>
                                                        {selectedUser.vehiclePlatePhotoDetail ? (
                                                            <a href={selectedUser.vehiclePlatePhotoDetail} target="_blank" rel="noopener noreferrer">
                                                                <img src={selectedUser.vehiclePlatePhotoDetail} alt="Plate" className="w-full h-48 object-cover rounded-lg border hover:opacity-90 transition-opacity" />
                                                            </a>
                                                        ) : <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">Not Uploaded</div>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    onClick={() => handleApprove(selectedUser.id)}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Approve User
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { alert('Reject logic to be implemented'); }} // Need reject endpoint
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-red-700 hover:bg-red-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Reject
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedUser(null)}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
