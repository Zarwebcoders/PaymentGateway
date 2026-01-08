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
const saveDb = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

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

// GET /api/payouts - List all payouts
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
        return res.status(400).json({ status: 'error', message: 'Beneficiary details are required (name, account number, IFSC code)' });
    }

    const txnId = 'PAYOUT_' + Date.now().toString(36).toUpperCase();
    const payoutRecord = {
        txn_id: txnId,
        amount,
        beneficiary_name,
        account_number,
        ifsc_code,
        status: 'pending',
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
        // NOTE: User requested 'Authorization: Bearer token' and bulk endpoint.
        // Assuming bulk endpoint takes the object directly or we might need to wrap it.
        // Proceeding with direct object as per common single-execution-on-bulk or simple migration logic.
        // If bulk strictly requires array, this might need: [payload]

        console.log('Sending Payout Request:', payload);

        const response = await axios.post(
            'https://partner.payraizen.com/tech/api/payout/create', // USER REQUEST: Revert to /create
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.PAYRAIZEN_TOKEN}`, // USER REQUEST 6
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 60000 // USER REQUEST 4 (Increased to 60s)
                // IPv4 forcing removed (USER REQUEST 5)
                // Connect timeout defaults are usually sufficient (USER REQUEST 3)
            }
        );

        console.log('Payraizen Response:', response.data);

        if (response.data && response.data.status === 'true') { // 'true' string as per PHP code
            updatePayoutStatus(txnId, 'processing', response.data);
            res.json({
                success: true,
                status: 'processing',
                transaction_id: txnId,
                gateway_order_id: response.data.order_details?.tid,
                message: 'Payout initiated successfully'
            });
        } else {
            const failureReason = response.data.msg || 'Unknown error';
            updatePayoutStatus(txnId, 'failed', response.data);
            res.status(400).json({
                success: false,
                message: failureReason,
                gateway_error: response.data
            });
        }

    } catch (error) {
        console.error('Payraizen API Error:', error.message);
        if (error.response) {
            console.error('Error Data:', error.response.data);
        }

        const errorData = error.response ? error.response.data : { error: error.message };
        updatePayoutStatus(txnId, 'failed', errorData);

        res.status(500).json({
            success: false,
            message: 'Failed to connect to payout gateway',
            error: error.message
        });
    }
});

// POST /webhook/payraizen - Handle Webhook
// POST /webhook/payout - Handle Payout Webhook
app.post('/webhook/payout', (req, res) => {
    try {
        const payload = req.body;
        console.log('Payout Webhook Received:', JSON.stringify(payload));

        // Logic from PHP: handle nested order_details
        let orderDetails = payload.order_details || payload.tid ? payload : (payload.payload ? payload.payload.order_details : null);

        if (!orderDetails || !orderDetails.tid) {
            return res.status(400).json({ status: 'error', message: 'Invalid payload' });
        }

        const gatewayOrderId = orderDetails.tid;
        const status = orderDetails.status;
        const bankUtr = orderDetails.bank_utr || orderDetails.utr || 'N/A';

        // Find payout
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

// POST /webhook/payin - Handle Payin Webhook (Placeholder)
app.post('/webhook/payin', (req, res) => {
    console.log('Payin Webhook Received:', JSON.stringify(req.body));
    // TODO: Implement Payin logic (Store in DB, update USER wallet, etc.)
    res.json({ status: 'success', message: 'Payin webhook received' });
});

// Backward compatibility (optional)
app.post('/webhook/payraizen', (req, res) => {
    console.log('Generic Webhook Received (redirecting to Payout logic)');
    // Reuse Payout logic or just warn
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
