import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const PayHereCheckout = ({ orderId, amount, items, customerDetails, onDismiss }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isPaymentStarted = useRef(false);

    useEffect(() => {
        const initializePayment = async () => {
            if (isPaymentStarted.current) return;
            isPaymentStarted.current = true;

            try {
                // 1. Fetch the hash and merchant id dynamically
                const response = await axios.get(`/api/payment/hash/${orderId}`);
                const { hash, merchant_id, amount: amountFormatted } = response.data;

                // 2. Setup PayHere event callbacks
                if (window.payhere) {
                    window.payhere.onCompleted = async function onCompleted(returnedOrderId) {
                        console.log("Payment completed. OrderID:" + returnedOrderId);
                        
                        // --- MOCK WEBHOOK FOR LOCALHOST SANDBOX ---
                        try {
                            await axios.post('/api/payment/notify', null, {
                                params: {
                                    merchant_id: merchant_id,
                                    order_id: returnedOrderId,
                                    payhere_amount: amountFormatted || amount,
                                    payhere_currency: "LKR",
                                    status_code: "2",
                                    md5sig: "mocked"
                                }
                            });
                        } catch(e) {
                            console.error("Mock webhook failed", e);
                        } finally {
                            window.location.href = `${window.location.origin}/my-orders?payment=success&orderId=${returnedOrderId}`;
                        }
                        // ------------------------------------------
                    };

                    window.payhere.onDismissed = function onDismissed() {
                        console.log("Payment dismissed");
                        onDismiss(); // Triggers parent to remove this component
                    };

                    window.payhere.onError = function onError(error) {
                        console.log("Error:" + error);
                        setError(error || "Payment gateway encountered an error.");
                        setLoading(false);
                    };

                    // 3. Create PayHere Payload
                    const payment = {
                        "sandbox": true,
                        "merchant_id": merchant_id,
                        "return_url": "http://localhost:5173/my-orders?payment_success_order=" + orderId,
                        "cancel_url": "http://localhost:5173/checkout",
                        "notify_url": "http://localhost:8080/api/payment/notify",
                        "order_id": orderId,
                        "items": items || "AgroLink Order",
                        "amount": amountFormatted || amount,
                        "currency": "LKR",
                        "hash": hash,
                        "first_name": customerDetails.first_name,
                        "last_name": customerDetails.last_name,
                        "email": customerDetails.email,
                        "phone": customerDetails.phone,
                        "address": customerDetails.address,
                        "city": customerDetails.city,
                        "country": "Sri Lanka"
                    };

                    // 4. Trigger PayHere popup
                    window.payhere.startPayment(payment);
                    
                    // Note: loading stays true so user sees "Securing Payment..." behind the modal!
                } else {
                    setError("PayHere library is not loaded. Please refresh.");
                    setLoading(false);
                }

            } catch (err) {
                console.error("Error initializing payment:", err);
                setError("Failed to securely initialize payment. Please try again.");
                setLoading(false);
            }
        };

        if (orderId) {
            initializePayment();
        }
    }, [orderId, customerDetails, items, amount, onDismiss]);

    if (error) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
                <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                    <h3 className="text-red-600 font-bold text-lg mb-2">Payment Initializer Error</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={onDismiss}
                        className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-300"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    // While PayHere JS evaluates and injects the iframe modal, display a beautiful ambient loading screen
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] px-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 border-4 border-[#1a7935] border-t-transparent rounded-full animate-spin mb-6 mx-auto"></div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Connecting to PayHere</h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                    Please do not close this window while we secure your transaction.
                </p>
            </div>
        </div>
    );
};

export default PayHereCheckout;
