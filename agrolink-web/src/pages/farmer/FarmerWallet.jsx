import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Wallet, ArrowUpRight, ArrowDownRight, Clock, CheckCircle, XCircle, Loader2, AlertTriangle, Building } from 'lucide-react';

export default function FarmerWallet() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);
    const [withdrawBank, setWithdrawBank] = useState('');
    const [withdrawAccount, setWithdrawAccount] = useState('');

    useEffect(() => {
        fetchWalletData();
        
        // Auto-refresh the wallet every 3 seconds for real-time feel
        const interval = setInterval(() => {
            fetchWalletData(false); // pass false or don't set loading to true on background polls
        }, 3000);
        
        return () => clearInterval(interval);
    }, [user]);

    const fetchWalletData = async () => {
        if (!user?.id) return;
        try {
            const [profileRes, txRes] = await Promise.all([
                axios.get(`/api/profiles/${user.id}`),
                axios.get(`/api/wallet/transactions?profileId=${user.id}`).catch(() => ({ data: [] }))
            ]);
            setProfile(profileRes.data);
            setTransactions(txRes.data || []);
        } catch (error) {
            console.error("Error fetching wallet data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        
        if (!withdrawAmount || isNaN(withdrawAmount) || Number(withdrawAmount) <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        if (Number(withdrawAmount) > (profile?.availableBalance || 0)) {
            alert("Insufficient available balance.");
            return;
        }

        setWithdrawing(true);
        try {
            await axios.post('/api/wallet/withdraw', {
                profileId: user.id,
                amount: Number(withdrawAmount),
                bankName: withdrawBank,
                accountNumber: withdrawAccount
            });
            alert("Withdrawal request submitted successfully! It will be reviewed by admin.");
            setWithdrawAmount('');
            fetchWalletData(); // Refresh balances
        } catch (error) {
            console.error("Withdrawal error", error);
            alert(error.response?.data || "Failed to submit withdrawal request.");
        } finally {
            setWithdrawing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-[#1a7935]" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 mb-8">
                <Wallet className="h-6 w-6 text-[#1a7935]" />
                Escrow Wallet & Payouts
            </h1>

            {/* Balances Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Available Balance */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-8 rounded-3xl shadow-sm border border-green-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Wallet className="h-32 w-32" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-green-800 font-bold uppercase tracking-wider text-sm mb-2">Available to Withdraw</p>
                        <h2 className="text-5xl font-black text-gray-900 drop-shadow-sm mb-4">
                            Rs. {profile?.availableBalance?.toFixed(2) || '0.00'}
                        </h2>
                        <p className="text-green-700 text-sm font-medium bg-white/50 inline-block px-3 py-1 rounded-full border border-green-200">
                            Cleared Vendor Earnings
                        </p>
                    </div>
                </div>

                {/* Pending Escrow */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-100 p-8 rounded-3xl shadow-sm border border-orange-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Clock className="h-32 w-32" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-orange-800 font-bold uppercase tracking-wider text-sm mb-2">Locked in Escrow (Pending)</p>
                        <h2 className="text-5xl font-black text-gray-900 drop-shadow-sm mb-4">
                            Rs. {profile?.pendingBalance?.toFixed(2) || '0.00'}
                        </h2>
                        <p className="text-orange-700 text-sm font-medium bg-white/50 inline-block px-3 py-1 rounded-full border border-orange-200 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            Releases after buyer confirms delivery
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Request Withdrawal Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Building className="h-5 w-5 text-gray-500" />
                            Request Bank Transfer
                        </h3>
                        <form onSubmit={handleWithdraw} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Bank Name</label>
                                <input
                                    type="text"
                                    required
                                    value={withdrawBank}
                                    onChange={(e) => setWithdrawBank(e.target.value)}
                                    placeholder="e.g. BOC, Commercial Bank"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1a7935] focus:outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Account Number</label>
                                <input
                                    type="text"
                                    required
                                    value={withdrawAccount}
                                    onChange={(e) => setWithdrawAccount(e.target.value)}
                                    placeholder="e.g. 1234567890"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1a7935] focus:outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Amount (Rs.)</label>
                                <input
                                    type="number"
                                    required
                                    min="100"
                                    max={profile?.availableBalance || 0}
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    placeholder="Minimum Rs. 100"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1a7935] focus:outline-none transition-all"
                                />
                                <p className="text-xs text-gray-500 mt-2 font-medium flex justify-between">
                                    <span>Max available:</span>
                                    <span className="text-[#1a7935] font-bold">Rs. {profile?.availableBalance?.toFixed(2) || '0.00'}</span>
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={withdrawing || profile?.availableBalance <= 0}
                                className="w-full py-4 px-6 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                            >
                                {withdrawing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUpRight className="h-5 w-5" />}
                                Withdraw Funds
                            </button>
                        </form>
                    </div>
                </div>

                {/* Ledger Transactions */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden h-full flex flex-col">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800">Ledger History</h3>
                        </div>
                        <div className="p-0 overflow-auto flex-1 max-h-[500px]">
                            {transactions.length === 0 ? (
                                <div className="p-10 text-center text-gray-500 font-medium">
                                    No transaction history found.
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-100">
                                    {transactions.map((tx) => (
                                        <li key={tx.id} className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-full ${tx.amount > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {tx.amount > 0 ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800">{tx.description}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs font-black uppercase text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full tracking-wider">
                                                            {tx.type}
                                                        </span>
                                                        <span className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-black text-lg ${tx.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                                    {tx.amount > 0 ? '+' : ''}Rs. {tx.amount.toFixed(2)}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
