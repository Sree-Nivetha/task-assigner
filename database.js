const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

// Initialize DB if not exists
if (!fs.existsSync(DB_FILE)) {
    const initialData = {
        users: [],
        tasks: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
}

function readDB() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
    get: (collection) => {
        const db = readDB();
        return db[collection] || [];
    },
    add: (collection, item) => {
        const db = readDB();
        if (!db[collection]) db[collection] = [];
        item.id = Date.now().toString(); // Simple ID generation
        db[collection].push(item);
        writeDB(db);
        return item;
    },
    update: (collection, id, updates) => {
        const db = readDB();
        if (!db[collection]) return null;
        const index = db[collection].findIndex(i => i.id === id);
        if (index === -1) return null;
        
        db[collection][index] = { ...db[collection][index], ...updates };
        writeDB(db);
        return db[collection][index];
    },
    delete: (collection, id) => {
        const db = readDB();
        if (!db[collection]) return false;
        const initialLength = db[collection].length;
        db[collection] = db[collection].filter(i => i.id !== id);
        writeDB(db);
        return db[collection].length < initialLength;
    },
    find: (collection, predicate) => {
        const db = readDB();
        return (db[collection] || []).find(predicate);
    }
};
