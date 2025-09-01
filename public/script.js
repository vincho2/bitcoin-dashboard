// Log to console to verify that script.js is loaded
console.log("script.js loaded");

// ------------------------------
// Generic function to fetch JSON data from a given URL
// ------------------------------
async function fetchJSON(url) {
    // Perform the HTTP request
    const res = await fetch(url);

    // If the response is not OK, throw an error to catch later
    if (!res.ok) throw new Error(`Fetch error ${url}: ${res.status}`);

    // Parse and return the JSON data
    return await res.json();
}

// ------------------------------
// Format functions
// ------------------------------
function fmtAmount(x) {
    const n = Number(x);
    if (isNaN(n)) return x;      // return original value if not a number
    return n.toFixed(8);         // show 8 decimals
}

function fmtTime(epochSec) {
    if (!epochSec) return '—';
    const d = new Date(epochSec * 1000);
    return d.toLocaleString();   // convert epoch seconds to local date/time string
}

function bytesToGB(bytes) {
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

// ------------------------------
// Functions to update the dashboard
// ------------------------------
async function refreshStatus() {
    try {
        // Fetch /api/status data
        const data = await fetchJSON('/api/status');

        // Update HTML elements by id
        document.getElementById('blockcount').textContent = data.blockcount;
        document.getElementById('chain').textContent = data.chain;
        document.getElementById('sync').textContent = data.sync;
        document.getElementById('blocks').textContent = data.blocks;
        document.getElementById('headers').textContent = data.headers;
        document.getElementById('peers').textContent = data.peers;
        document.getElementById('pruned').textContent = data.pruned ? 'yes' : 'no';
        document.getElementById('size').textContent = bytesToGB(data.size_on_disk); // convert bytes to GB
    } catch (e) {
        console.error(e); // log any errors
    }
}

async function refreshBalance() {
    try {
        // Fetch /api/balance data
        const data = await fetchJSON('/api/balance');
        document.getElementById('balance').textContent = data.balance;
    } catch (e) {
        console.error(e);
    }
}

async function refreshTxs() {
    try {
        // Fetch last 10 transactions
        const data = await fetchJSON('/api/txs?count=10');
        const tbody = document.getElementById('txBody');
        tbody.innerHTML = ''; // clear table body before adding new rows

        // Loop through transactions and create table rows
        for (const tx of data.txs) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
<td>${fmtTime(tx.time)}</td>
<td>${tx.category}</td>
<td>${fmtAmount(tx.amount)}</td>
<td>${tx.confirmations ?? 0}</td>
<td style="max-width:340px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${tx.txid}</td>
`;
            tbody.appendChild(tr);
        }

        // Update transaction count
        document.getElementById('txCount').textContent = `${data.txs.length} item(s)`;
    } catch (e) {
        console.error(e);
    }
}

// ------------------------------
// Start function to initialize all updates
// ------------------------------
function start() {
    // Initial refresh
    refreshStatus();
    refreshBalance();
    refreshTxs();

    // Set periodic refresh intervals (in milliseconds)
    setInterval(refreshStatus, 10000);   // refresh every 10s
    setInterval(refreshBalance, 10000);  // refresh every 10s
    setInterval(refreshTxs, 15000);      // refresh every 15s
}

// Wait until DOM is fully loaded before starting
document.addEventListener('DOMContentLoaded', start);
