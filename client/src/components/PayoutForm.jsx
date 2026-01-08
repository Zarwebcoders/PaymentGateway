import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Send, CreditCard, User, Hash } from 'lucide-react';

const PayoutForm = ({ onPayoutSuccess }) => {
    const [formData, setFormData] = useState({
        amount: '',
        beneficiary_name: '',
        account_number: '',
        ifsc_code: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };



    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            const response = await axios.post('/api/payout/create', {
                ...formData,
                amount: Number(formData.amount)
            });
            setMessage({ type: 'success', text: 'Payout initiated successfully!' });
            if (onPayoutSuccess) onPayoutSuccess();
            setFormData({ amount: '', beneficiary_name: '', account_number: '', ifsc_code: '' });
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Payout failed. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-2xl p-8 w-full max-w-lg mx-auto"
        >
            <div className="flex items-center gap-3 mb-6">
                <CreditCard className="text-cyber-accent w-8 h-8" />
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-cyber-accent">
                    Initiate Payout
                </h2>
            </div>

            {message && (
                <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-cyber-success/20 text-cyber-success border border-cyber-success/50' : 'bg-cyber-danger/20 text-cyber-danger border border-cyber-danger/50'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <label className="block text-sm text-gray-400 mb-1">Amount</label>
                    <div className="relative">
                        <span className="absolute left-4 top-3.5 text-gray-500">₹</span>
                        <input
                            type="number"
                            name="amount"
                            value={formData.amount}
                            onChange={handleChange}
                            className="input-field pl-10"
                            placeholder="0.00"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-gray-400 mb-1">Beneficiary Name</label>
                    <div className="relative">
                        <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            name="beneficiary_name"
                            value={formData.beneficiary_name}
                            onChange={handleChange}
                            className="input-field pl-12"
                            placeholder="John Doe"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-gray-400 mb-1">Account Number</label>
                    <div className="relative">
                        <Hash className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            name="account_number"
                            value={formData.account_number}
                            onChange={handleChange}
                            className="input-field pl-12"
                            placeholder="XXXXXXXXXXXX"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-gray-400 mb-1">IFSC Code</label>
                    <input
                        type="text"
                        name="ifsc_code"
                        value={formData.ifsc_code}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="HDFC0001234"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary mt-6 flex items-center justify-center gap-2"
                >
                    {loading ? 'Processing...' : (
                        <>
                            Send Request <Send className="w-4 h-4" />
                        </>
                    )}
                </button>
            </form>
        </motion.div>
    );
};

export default PayoutForm;
