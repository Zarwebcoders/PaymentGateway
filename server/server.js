require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Simple file-based persistence
const DB_FILE = path.join(__dirname, 'db.json');

// Initialize DB
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ payouts: [] }, null, 2));
}

const getDb = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const saveDb = (data) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Database save failed (Vercel Read-Only):', err.message);
        // On Vercel, we cannot save to file. We proceed without saving.
    }
};

// Helper to update payout status
const updatePayoutStatus = (txnId, status, responseData) => {
    const db = getDb();
    const index = db.payouts.findIndex(p => p.txn_id === txnId);
    if (index !== -1) {
        db.payouts[index].status = status;
        db.payouts[index].gateway_response = responseData;
        db.payouts[index].updated_at = new Date().toISOString();
        if (status === 'success' || status === 'processing') {
            if (responseData.order_details && responseData.order_details.tid) {
                db.payouts[index].gateway_order_id = responseData.order_details.tid;
            }
        }
        saveDb(db);
    }
};

// Routes

// GET /api/payouts - List all payouts (and payins)
app.get('/api/payouts', (req, res) => {
    try {
        const db = getDb();
        res.json(db.payouts.reverse()); // Show newest first
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch payouts' });
    }
});

// POST /api/payout/create - Initiate Payout
app.post('/api/payout/create', async (req, res) => {
    const { amount, beneficiary_name, account_number, ifsc_code } = req.body;

    // Validation
    if (!amount || amount <= 0) {
        return res.status(400).json({ status: 'error', message: 'Invalid amount' });
    }
    if (!beneficiary_name || !account_number || !ifsc_code) {
        return res.status(400).json({ status: 'error', message: 'Beneficiary details are required' });
    }

    const txnId = 'PAYOUT_' + Date.now().toString(36).toUpperCase();
    const payoutRecord = {
        txn_id: txnId,
        amount,
        beneficiary_name,
        account_number,
        ifsc_code,
        status: 'pending',
        type: 'payout',
        gateway_name: 'payraizen',
        created_at: new Date().toISOString()
    };

    // Save initial record
    const db = getDb();
    db.payouts.push(payoutRecord);
    saveDb(db);

    // Payraizen Request Data
    const payload = {
        beneficiary_name,
        account_number,
        ifsc_code,
        amount,
        mid: process.env.PAYRAIZEN_MID,
        txn_id: txnId
    };

    try {
        console.log('Sending Payout Request:', payload);
        const response = await axios.post(
            'https://partner.payraizen.com/tech/api/payout/create',
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.PAYRAIZEN_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 60000
            }
        );

        console.log('Payraizen Response:', response.data);

        if (response.data && response.data.status === 'true') {
            updatePayoutStatus(txnId, 'processing', response.data);
            res.json({
                success: true,
                status: 'processing',
                transaction_id: txnId,
                gateway_order_id: response.data.order_details?.tid,
                message: 'Payout initiated successfully'
            });
        } else {
            updatePayoutStatus(txnId, 'failed', response.data);
            res.status(400).json({
                success: false,
                message: response.data.msg || 'Unknown error',
                gateway_error: response.data
            });
        }

    } catch (error) {
        console.error('Payraizen API Error:', error.message);
        const errorData = error.response ? error.response.data : { error: error.message };
        updatePayoutStatus(txnId, 'failed', errorData);

        res.status(500).json({
            success: false,
            message: 'Failed to connect to payout gateway',
            error: error.message
        });
    }
});

// POST /api/payin/create - Initiate Payin (Collection)
app.post('/api/payin/create', async (req, res) => {
    const { amount, name, email, mobile } = req.body;

    // Validation
    if (!amount || amount <= 0) {
        return res.status(400).json({ status: 'error', message: 'Invalid amount' });
    }
    if (!name || !email || !mobile) {
        return res.status(400).json({ status: 'error', message: 'Name, Email, and Mobile are required' });
    }

    const txnId = 'PAYIN_' + Date.now().toString(36).toUpperCase();
    const payinRecord = {
        txn_id: txnId,
        amount,
        payer_name: name,
        payer_email: email,
        payer_mobile: mobile,
        status: 'pending',
        type: 'payin',
        gateway_name: 'payraizen',
        created_at: new Date().toISOString()
    };

    // Save initial record (Try/Catch wrapper used in saveDb)
    const db = getDb();
    db.payouts.push(payinRecord);
    saveDb(db);

    // Payraizen Request Data
    const payload = {
        mid: txnId, // API expects Unique ID here (Merchant Invoice ID), not Account ID
        amount,
        name,
        email,
        mobile
    };

    console.log('Sending Payin Request:', payload);

    try {
        const response = await axios.post(
            'https://partner.payraizen.com/tech/api/payin/create_intent',
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.PAYRAIZEN_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 60000
            }
        );

        console.log('Payraizen Payin Response:', response.data);

        if (response.data && response.data.status === 'true') {
            updatePayoutStatus(txnId, 'processing', response.data);
            res.json({
                success: true,
                status: 'processing',
                transaction_id: txnId,
                gateway_data: response.data,
                message: 'Payment Link Generated'
            });
        } else {
            updatePayoutStatus(txnId, 'failed', response.data);
            res.status(400).json({
                success: false,
                message: response.data.msg || 'Payment initiation failed',
                gateway_error: response.data
            });
        }

    } catch (error) {
        console.error('Payraizen API Error:', error.message);
        if (error.response) console.error('Error Data:', error.response.data);

        updatePayoutStatus(txnId, 'failed', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to connect to payment gateway',
            error: error.message
        });
    }
});

// POST /webhook/payout - Handle Payout Webhook
app.post('/webhook/payout', (req, res) => {
    try {
        const payload = req.body;
        console.log('Payout Webhook Received:', JSON.stringify(payload));

        let orderDetails = payload.order_details || payload.tid ? payload : (payload.payload ? payload.payload.order_details : null);

        if (!orderDetails || !orderDetails.tid) {
            return res.status(400).json({ status: 'error', message: 'Invalid payload' });
        }

        const gatewayOrderId = orderDetails.tid;
        const status = orderDetails.status;
        const bankUtr = orderDetails.bank_utr || orderDetails.utr || 'N/A';

        const db = getDb();
        const payoutIndex = db.payouts.findIndex(p => p.gateway_order_id === gatewayOrderId);

        if (payoutIndex !== -1) {
            let newStatus = db.payouts[payoutIndex].status;

            if (status === 'success' || status === 'completed') {
                newStatus = 'completed';
            } else if (status === 'failed' || status === 'failure') {
                newStatus = 'failed';
            }

            db.payouts[payoutIndex].status = newStatus;
            db.payouts[payoutIndex].utr = bankUtr;
            db.payouts[payoutIndex].gateway_response = payload;
            db.payouts[payoutIndex].updated_at = new Date().toISOString();

            saveDb(db);

            res.json({ status: 'success', message: 'Payout updated' });
        } else {
            console.warn('Webhook: Payout not found for TID', gatewayOrderId);
            res.json({ status: 'accepted', message: 'Payout not found but webhook received' });
        }

    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

// POST /webhook/payin - Handle Payin Webhook
app.post('/webhook/payin', (req, res) => {
    console.log('Payin Webhook Received:', JSON.stringify(req.body));
    // Implementation for DB update similar to payout can be added here
    res.json({ status: 'success', message: 'Payin webhook received' });
});

// Backward compatibility
app.post('/webhook/payraizen', (req, res) => {
    res.redirect(307, '/webhook/payout');
});

process.on('exit', (code) => {
    console.log(`Process exiting with code: ${code}`);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
