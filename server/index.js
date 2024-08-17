// server.js
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
const mempoolJS = require("@mempool/mempool.js")
const cors = require("cors");

const port = 3001;

app.use(cors({
    origin: '*', // Allows requests from any origin (you can restrict this to specific domains if needed)
    methods: 'GET,POST',
    allowedHeaders: 'Content-Type'
}));

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Route to handle transaction requests
app.post('/api/sendTransaction', async (req, res) => {
    let { txHex } = req.body;

    console.log(txHex)

    // Ensure txHex is provided
    if (!txHex) {
        return res.status(400).json({ error: 'Transaction hex is required' });
    }


    try {

        const { bitcoin: { transactions } } = mempoolJS({
            hostname: 'mempool.space'
        });

        const txid = await transactions.postTx({ txHex });
        console.log(txid);
        
        // Forward the response from mempool.space to the client
        res.status(response.status).json(response.data);
    } catch (error) {
        // Handle errors
        console.error('Error forwarding request to mempool.space:', error);
        res.status(error.response ? error.response.status : 500).json({ error: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Proxy server listening on port ${port}`);
});