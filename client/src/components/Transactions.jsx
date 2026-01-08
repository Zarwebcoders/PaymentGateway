import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const TransactionHistory = ({ refreshTrigger }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/payouts');
            setTransactions(response.data);
        } catch (error) {
            console.error('Failed to fetch transactions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
        // Poll for updates every 10 seconds
        const interval = setInterval(fetchTransactions, 60000);
        return () => clearInterval(interval);
    }, [refreshTrigger]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
            case 'success': return 'text-cyber-success';
            case 'failed': return 'text-cyber-danger';
            case 'pending': return 'text-yellow-400';
            case 'processing': return 'text-blue-400';
            default: return 'text-gray-400';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
            case 'success': return <CheckCircle className="w-4 h-4" />;
            case 'failed': return <XCircle className="w-4 h-4" />;
            case 'pending': return <Clock className="w-4 h-4" />;
            case 'processing': return <RefreshCw className="w-4 h-4 animate-spin" />;
            default: return <AlertCircle className="w-4 h-4" />;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel rounded-2xl p-6 w-full max-w-4xl mx-auto mt-8"
        >
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Recent Transactions</h3>
                <button onClick={fetchTransactions} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <RefreshCw className={`w-5 h-5 text-cyber-accent ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-gray-400 border-b border-white/10 text-sm">
                            <th className="p-4">TXN ID</th>
                            <th className="p-4">Beneficiary</th>
                            <th className="p-4">Amount</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {transactions.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-gray-500">No transactions found</td>
                            </tr>
                        ) : (
                            transactions.map((txn, index) => (
                                <motion.tr
                                    key={txn.txn_id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                >
                                    <td className="p-4 font-mono text-xs text-gray-300">{txn.txn_id}</td>
                                    <td className="p-4 text-white">{txn.beneficiary_name}</td>
                                    <td className="p-4 text-cyber-accent font-bold">₹{txn.amount}</td>
                                    <td className="p-4 text-gray-400 text-xs">
                                        {new Date(txn.created_at).toLocaleString()}
                                    </td>
                                    <td className="p-4">
                                        <span className={`flex items-center gap-2 ${getStatusColor(txn.status)}`}>
                                            {getStatusIcon(txn.status)}
                                            <span className="uppercase text-xs font-bold">{txn.status}</span>
                                        </span>
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
};

export default TransactionHistory;
