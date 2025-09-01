// Import Express framework
import express from 'express';
// Import path module to handle file paths
import path from 'path';
// Import 'fileURLToPath' to get __dirname in ES modules
import { fileURLToPath } from 'url';
// Import dotenv to read .env variables
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

// ====== Helper to get __dirname in ES modules ======
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====== Load configuration from environment variables ======
const PORT = process.env.PORT || 3000; // Server port
const HOST = process.env.HOST || '0.0.0.0'; // Server host
const RPC_USER = process.env.RPC_USER; // Bitcoin RPC username
const RPC_PASS = process.env.RPC_PASS; // Bitcoin RPC password
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8332'; // Bitcoin RPC URL

// ====== Initialize Express app ======
const app = express();

// ====== Simple RPC utility function ======
async function rpcCall(method, params = []) {
    // Perform a POST request to Bitcoin RPC
    const res = await fetch(RPC_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Basic authentication using RPC_USER and RPC_PASS
            'Authorization': 'Basic ' + Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64')
        },
        body: JSON.stringify({ jsonrpc: '1.0', id: 'nodejs', method, params })
    });

    // Check for HTTP errors
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`RPC HTTP ${res.status}: ${text}`);
    }

    const json = await res.json();

    // Check for Bitcoin RPC errors
    if (json.error) {
        throw new Error(`RPC error: ${JSON.stringify(json.error)}`);
    }

    // Return the result
    return json.result;
}

// ====== API routes ======

// GET /api/status -> returns basic blockchain and network info
app.get('/api/status', async (req, res) => {
    try {
        // Make 3 RPC calls in parallel
        const [blockcount, blockchaininfo, networkinfo] = await Promise.all([
            rpcCall('getblockcount'),
            rpcCall('getblockchaininfo'),
            rpcCall('getnetworkinfo')
        ]);

        // Send JSON response
        res.json({
            blockcount,
            chain: blockchaininfo.chain,
            sync: +(blockchaininfo.verificationprogress * 100).toFixed(2),
            headers: blockchaininfo.headers,
            blocks: blockchaininfo.blocks,
            peers: networkinfo.connections,
            pruned: blockchaininfo.pruned,
            size_on_disk: blockchaininfo.size_on_disk
        });
    } catch (e) {
        // Handle errors
        res.status(500).json({ error: e.message });
    }
});

// GET /api/balance -> returns wallet balance
app.get('/api/balance', async (req, res) => {
    try {
        const balance = await rpcCall('getbalance');
        res.json({ balance });
    } catch (e) {
        // If there is no wallet configured, return an explicit message
        if (e.message.includes('No wallet')) {
            res.json({ balance: 0, message: 'No wallet configured on this node yet.'});
        } else {
            res.status(500).json({ error: e.message });
        }
    }
});

// GET /api/txs?count=N -> returns last N transactions (max 50)
app.get('/api/txs', async (req, res) => {
    try {
        const count = Math.min(parseInt(req.query.count || '10', 10), 50);
        const txs = await rpcCall('listtransactions', ['*', count, 0, true]);
        res.json({ txs });
    } catch (e) {
        console.error('Wallet not available:', e.message);
        // renvoyer un tableau vide
        res.json({ txs: [], message: 'No wallet defined' });
    }
});

// GET /api/ping -> simple health check
app.get('/api/ping', (req, res) => res.json({ pong: true }));

// ====== Serve static frontend ======
app.use(express.static(path.join(__dirname, 'public')));

// ====== Start server ======
app.listen(PORT, HOST, () => {
    console.log(`✔ Dashboard available at http://${HOST}:${PORT}`);
    console.log('✔ RPC config:', { RPC_URL, RPC_USER: !!RPC_USER, RPC_PASS: !!RPC_PASS });
});
