const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

function writeAll (fileName, data) {
    const filePath = path.join(dataDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8'); // data/notes.json   data/Notes.json
}

function readAll (fileName) {
    const filePath = path.join(dataDir, fileName);
    if (!fs.existsSync(filePath)) {
        return [];
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

module.exports = {
    writeAll,
    readAll
};