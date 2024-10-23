const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const torrentStream = require('torrent-stream');
const http = require('http');
const { Server } = require('socket.io');

const express = require('express');
const app = express();
const port = 3000;

app.use(express.static('.'));
app.use(express.json());
const server = http.createServer(app);

// Initialize Socket.IO with the server
const io = new Server(server);

// Configuration for OAuth 2.0
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const CLIENT_SECRETS_FILE = 'client_secrets.json'; // Path to your credentials JSON
const CREDENTIALS_FILE = 'token.json'; // File to store the credentials

async function authenticateDrive() {
    const oAuth2Client = await loadCredentials();
    return google.drive({ version: 'v3', auth: oAuth2Client });
}

async function loadCredentials() {
    const content = fs.readFileSync(CLIENT_SECRETS_FILE);
    const { client_secret, client_id, redirect_uris } = JSON.parse(content).installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, `http://localhost:8080`); // Fixed port 8080

    // Load token or request new one
    if (fs.existsSync(CREDENTIALS_FILE)) {
        const token = fs.readFileSync(CREDENTIALS_FILE);
        oAuth2Client.setCredentials(JSON.parse(token));
    } else {
        return getAccessToken(oAuth2Client);
    }
    return oAuth2Client;
}

async function getAccessToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);

    const server = require('http').createServer((req, res) => {
        const url = require('url');
        const qs = url.parse(req.url, true).query;

        // Extract the code from the URL query parameters
        if (qs.code) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('Authorization successful! You can close this window.');

            // Exchange the authorization code for access tokens
            oAuth2Client.getToken(qs.code, (err, tokens) => {
                if (err) return console.error('Error retrieving access token', err);
                oAuth2Client.setCredentials(tokens);
                fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(tokens));
                console.log('Token stored to', CREDENTIALS_FILE);
                server.close(); // Close the server after getting the token
            });
        }
    });

    server.listen(8080, () => {
        console.log('Listening on port 8080...');
    });
}

// Don't touch above code

// Setup Socket.IO connection
io.on('connection', (socket) => {
    console.log('A user connected');
    
    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

  app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});


  app.post('/upload', async (req, res) => {
    const { magnetLink } = req.body;
    const driveService = await authenticateDrive();
    const folderId = ''; // Your folder ID

    try {
        res.json({ success: true, message: 'Upload started' });
        await downloadAndUploadTorrent(magnetLink, driveService, folderId, io);
    } catch (error) {
        console.error('Error:', error);
        io.emit('uploadError', { message: 'Upload failed' });
    }
});

function downloadAndUploadTorrent(magnetLink, driveService, folderId, io) {
    return new Promise((resolve, reject) => {
        const engine = torrentStream(magnetLink);
        let uploadedFiles = [];

        engine.on('ready', async () => {
            console.log('Torrent downloading and uploading...');
            const files = engine.files;

            files.sort((a, b) => b.length - a.length);

            if (files.length === 0) {
                console.log('No files found in the torrent.');
                io.emit('uploadComplete', { files: uploadedFiles });
                return resolve(uploadedFiles);
            }

            // Get folder link at the start
            try {
                const folderData = await driveService.files.get({
                    fileId: folderId,
                    fields: 'webViewLink'
                });
                io.emit('folderLink', { folderLink: folderData.data.webViewLink });
            } catch (error) {
                console.error('Error getting folder link:', error);
            }

            for (const file of files) {
                try {
                    const uploadedFile = await uploadFileWithProgress(driveService, file, folderId, io);
                    uploadedFiles.push(uploadedFile);
                } catch (error) {
                    console.error(`Error uploading ${file.name}:`, error);
                    io.emit('uploadError', { message: `Error uploading ${file.name}` });
                    return reject(error);
                }
            }

            console.log('All files uploaded successfully.');
            io.emit('uploadComplete', { files: uploadedFiles });
            resolve(uploadedFiles);
        });
    });
}



async function uploadFileWithProgress(driveService, file, folderId, io) {
    return new Promise((resolve, reject) => {
        const fileName = file.name;
        console.log(`Uploading ${fileName}...`);

        const fileSize = file.length;
        let uploadedBytes = 0;

        const fileStream = file.createReadStream();
        fileStream.on('data', (chunk) => {
            uploadedBytes += chunk.length;
            const progress = (uploadedBytes / fileSize) * 100;
            io.emit('uploadProgress', { 
                fileName, 
                progress: progress.toFixed(2) 
            });
        });

        const media = {
            mimeType: file.mime || 'application/octet-stream',
            body: fileStream
        };

        driveService.files.create({
            requestBody: {
                name: fileName,
                parents: [folderId]
            },
            media: media,
            fields: 'id, name, webViewLink, webContentLink'
        }, (err, response) => {
            if (err) {
                console.error(`Error uploading ${fileName}:`, err);
                reject(err);
            } else {
                console.log(`Uploaded ${fileName} successfully.`);
                
                // Emit the file data with links
                const fileData = {
                    name: fileName,
                    viewLink: response.data.webViewLink,
                    downloadLink: response.data.webContentLink,
                    fileId: response.data.id
                };
                
                io.emit('fileUploaded', fileData);
                resolve(fileData);
            }
        });
    });
}

async function main() {
    const driveService = await authenticateDrive();
    const magnetLink = 'magnet:?xt=urn:btih:357E332E385E41815DC6DF1A815775BFDF753F77&dn=The+Lightning+Seeds+-+Tomorrow%26%23039%3Bs+Here+Today+%282024%29320mp3&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.demonii.com%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Finferno.demonoid.is%3A3391%2Fannounce&tr=udp%3A%2F%2Ftracker-udp.gbitt.info%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=http%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2Fopentracker.i2p.rocks%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Fcoppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.zer0day.to%3A1337%2Fannounce';
    const folderId = ''; // Your folder ID

    try {
        // Start the torrent download and upload directly to Google Drive
        await downloadAndUploadTorrent(magnetLink, driveService, folderId);
    } catch (error) {
        console.error('Error:', error);
    }
}


server.listen(port, () => {
    console.log(`Server started on port ${port}`);
  });
// main();
