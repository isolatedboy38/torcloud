# Torrent to Google Drive Uploader

A web application that allows users to download torrents and upload them directly to Google Drive. Built with Node.js, Express, and Socket.IO for real-time progress tracking.

## Features

- Simple web interface for magnet link input
- Real-time upload progress tracking
- Direct upload to a specific Google Drive folder
- Support for multiple file torrents
- Download links generation after successful upload
- Responsive progress bars for each file
- OAuth 2.0 authentication with Google Drive

## Prerequisites

Before you begin, ensure you have met the following requirements:
- Node.js installed (version 12 or higher)
- A Google Cloud Console account
- Google Drive API enabled
- OAuth 2.0 credentials configured

## Installation

1. Clone the repository:
```
git clone <repository-url>
cd TorrentToGDrive
```

2. Install Dependencies
```
npm install
```

3. Set up Google Drive API:
Create a project in the Google Cloud Console
Enable Google Drive API
Create OAuth 2.0 credentials
Download the credentials and save them as client_secrets.json in the project root

## Configuration
Place your client_secrets.json file in the project root directory
Update the folderId in main.js with your Google Drive folder ID where files will be uploaded.

## Usage
1. Start server
   ```
   node main.js
   ```
2. Open the web browser and navigate to
  http://localhost:3000

3. If running for the first time:

  Click the authorization URL in the console
  Complete Google OAuth authentication
  The token will be saved as token.json
4. Enter a magnet link in the web interface and click "Upload"

5. monitor the upload progress in real-time

6. Click the "Download" button to access the uploaded file in Google Drive.


## Dependencies
npm install express googleapis torrent-stream socket.io fs path HTTP

## Project Structure
TorrentToGDrive/
├── index.html        # Web interface
├── main.js          # Server and main logic
├── client_secrets.json  # Google OAuth credentials (not included)
└── token.json       # Generated OAuth token (not included)

## Security Notes
Keep your client_secrets.json and token.json files secure
Don't commit these files to version control
Use environment variables for sensitive information in production
Contributing
Fork the repository
Create your feature branch
Commit your changes
Push to the branch
Create a new Pull Request
License
This project is licensed under the MIT License - see the LICENSE file for details

## Acknowledgments
Google Drive API
WebTorrent community
Socket.IO team
Support
For support, please open an issue in the repository or contact isolatedboy38@gmail.com
