import React, { useState } from 'react';
import axios from 'axios';
import { Send, User, Smartphone, Mail, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';

const PaymentForm = ({ onTransactionComplete }) => {
    const [formData, setFormData] = useState({
        amount: '',
        name: '',
        email: '',
        mobile: ''
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // 'success', 'error', null
    const [message, setMessage] = useState('');
    const [qrData, setQrData] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);
        setQrData(null);

        try {
            const response = await axios.post('/api/payin/create', {
                ...formData,
                amount: Number(formData.amount)
            });

            if (response.data && response.data.success) {
                setStatus('success');
                setMessage('Payment Link Generated! Scan to Pay.');
                // Assuming the API returns a UPI link or QR URL in gateway_data
                // Check documentation for exact field. Common: 'intent_link', 'qr_code', 'payment_url'
                const gatewayData = response.data.gateway_data;
                const qrContent = gatewayData.intent_link || gatewayData.upi_link || gatewayData.qr_code || JSON.stringify(gatewayData);

                setQrData(qrContent);

                if (onTransactionComplete) onTransactionComplete();
            } else {
                setStatus('error');
                setMessage(response.data.message || 'Payment initiation failed');
            }
        } catch (error) {
            console.error('Payment Error:', error);
            setStatus('error');
            setMessage(error.response?.data?.message || 'Server error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-8 rounded-2xl w-full max-w-md mx-auto relative overflow-hidden"
        >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyber-primary via-cyber-accent to-cyber-primary animate-pulse-slow"></div>

            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 rounded-xl bg-cyber-primary/20 text-cyber-accent border border-cyber-accent/30 shadow-[0_0_15px_rgba(0,243,255,0.3)]">
                    <Smartphone className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Receive Payment
                    </h2>
                    <p className="text-xs text-gray-400 font-mono tracking-wider">SECURE UPIGATEWAY</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Amount Field */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Amount (INR)</label>
                    <div className="relative group">
                        <input
                            type="number"
                            name="amount"
                            value={formData.amount}
                            onChange={handleChange}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pl-4 text-white placeholder-gray-600 focus:outline-none focus:border-cyber-accent/50 focus:ring-1 focus:ring-cyber-accent/50 transition-all font-mono text-lg"
                            placeholder="0.00"
                            required
                        />
                        <div className="absolute right-4 top-3.5 text-gray-500 font-bold">$</div>
                    </div>
                </div>

                {/* Payer Name */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Payer Name</label>
                    <div className="relative group">
                        <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-cyber-accent transition-colors" />
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pl-12 text-white placeholder-gray-600 focus:outline-none focus:border-cyber-accent/50 focus:ring-1 focus:ring-cyber-accent/50 transition-all"
                            placeholder="John Doe"
                            required
                        />
                    </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-cyber-accent transition-colors" />
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pl-12 text-white placeholder-gray-600 focus:outline-none focus:border-cyber-accent/50 focus:ring-1 focus:ring-cyber-accent/50 transition-all"
                            placeholder="john@example.com"
                            required
                        />
                    </div>
                </div>

                {/* Mobile */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Mobile Number</label>
                    <div className="relative group">
                        <Smartphone className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-cyber-accent transition-colors" />
                        <input
                            type="tel"
                            name="mobile"
                            value={formData.mobile}
                            onChange={handleChange}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pl-12 text-white placeholder-gray-600 focus:outline-none focus:border-cyber-accent/50 focus:ring-1 focus:ring-cyber-accent/50 transition-all"
                            placeholder="9876543210"
                            required
                        />
                    </div>
                </div>

                {/* Status Message */}
                <AnimatePresence>
                    {status && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`rounded-lg p-3 text-sm flex items-start gap-2 ${status === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}
                        >
                            {status === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                            <span>{message}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* QR Code Display */}
                <AnimatePresence>
                    {status === 'success' && qrData && (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col items-center justify-center p-4 bg-white rounded-xl mt-4"
                        >
                            <QRCodeCanvas value={qrData} size={200} />
                            <p className="text-gray-900 font-bold mt-2 text-sm text-center">Scan with any UPI App</p>
                            <p className="text-xs text-gray-500 font-mono break-all text-center mt-1 px-2">{qrData}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className={`
                        w-full py-4 rounded-xl font-bold uppercase tracking-wider text-sm transition-all duration-300
                        flex items-center justify-center gap-2
                        ${loading
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
                            : 'bg-gradient-to-r from-cyber-primary to-cyber-accent text-black hover:shadow-[0_0_20px_rgba(0,243,255,0.4)] hover:scale-[1.02] active:scale-[0.98]'
                        }
                    `}
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Processing...</span>
                        </>
                    ) : (
                        <>
                            <span>Generate Payment Link</span>
                            <Send className="w-4 h-4" />
                        </>
                    )}
                </button>
            </form>
        </motion.div>
    );
};

export default PaymentForm;
