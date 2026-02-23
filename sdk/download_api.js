const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PROJECT_ID = '01K8WYNWJCJ9QN6C401YCWR701';
const BASE_URL = 'https://api-stage-hyperexecute.lambdatestinternal.com';
const API_PATH = `/logistics/v1.0/project/${PROJECT_ID}/files/download`;

// Download API function that replicates the curl command
function downloadFile() {
    const url = `${BASE_URL}${API_PATH}`;
    
    // Request payload
    const postData = JSON.stringify({
        "files": [
            {
                "name": "payload.zip"
            }
        ]
    });
    
    // Request headers matching the curl command
    const options = {
        hostname: 'api-stage-hyperexecute.lambdatestinternal.com',
        port: 443,
        path: API_PATH,
        method: 'POST',
        headers: {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
            'authorization': 'Basic c2hyZXlhbnNoYzpMVF9nQ3FFNnlDS29hemNncGRSbEN3UEJyY2d1Qk5LdXE2TXNZUjFEb0k0eW1TamcxMg==',
            'content-type': 'application/json',
            'origin': 'https://hyperexecute.lambdatest.com',
            'priority': 'u=1, i',
            'referer': `https://hyperexecute.lambdatest.com/hyperexecute/projects/detail?projectId=${PROJECT_ID}`,
            'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'content-length': Buffer.byteLength(postData)
        }
    };
    
    console.log('Starting download...');
    console.log('URL:', url);
    console.log('Headers:', JSON.stringify(options.headers, null, 2));
    console.log('Payload:', postData);
    
    const req = https.request(options, (res) => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers:`, res.headers);
        
        // Check if response is successful
        if (res.statusCode !== 200) {
            console.error(`Download failed with status: ${res.statusCode}`);
            return;
        }
        
        // Get the filename from Content-Disposition header or use default
        let filename = 'payload.zip';
        if (res.headers['content-disposition']) {
            const match = res.headers['content-disposition'].match(/filename="(.+)"/);
            if (match) {
                filename = match[1];
            }
        }
        
        // Create file path at the same level
        const filePath = path.join(__dirname, filename);
        console.log(`Saving file to: ${filePath}`);
        
        // Create write stream
        const fileStream = fs.createWriteStream(filePath);
        
        // Pipe response to file
        res.pipe(fileStream);
        
        fileStream.on('finish', () => {
            console.log(`✅ File downloaded successfully: ${filename}`);
            console.log(`📁 Saved at: ${filePath}`);
            
            // Get file stats
            const stats = fs.statSync(filePath);
            console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
            
            // Unzip the file to project folder
            unzipToProjectFolder(filePath, filename);
        });
        
        fileStream.on('error', (err) => {
            console.error('❌ Error writing file:', err.message);
        });
    });
    
    req.on('error', (err) => {
        console.error('❌ Request error:', err.message);
    });
    
    // Write the request data
    req.write(postData);
    req.end();
}

// Function to unzip files to project folder
function unzipToProjectFolder(zipFilePath, zipFileName) {
    try {
        // Create project folder
        const projectFolder = path.join(__dirname, PROJECT_ID);
        if (!fs.existsSync(projectFolder)) {
            fs.mkdirSync(projectFolder, { recursive: true });
            console.log(`📁 Created project folder: ${projectFolder}`);
        }
        
        console.log(`🔓 Unzipping ${zipFileName} to ${projectFolder}...`);
        
        // Unzip using system unzip command
        const unzipCommand = `unzip -o "${zipFilePath}" -d "${projectFolder}"`;
        execSync(unzipCommand, { stdio: 'inherit' });
        
        console.log(`✅ Files extracted to: ${projectFolder}`);
        
        // List extracted files
        const extractedFiles = fs.readdirSync(projectFolder);
        console.log(`📋 Extracted files: ${extractedFiles.join(', ')}`);
        
        // Clean up zip file (optional)
        // fs.unlinkSync(zipFilePath);
        // console.log(`🗑️ Cleaned up: ${zipFileName}`);
        
    } catch (error) {
        console.error(`❌ Error unzipping file: ${error.message}`);
        
        // Fallback: try to extract manually if unzip command fails
        try {
            console.log('🔄 Trying manual extraction...');
            const projectFolder = path.join(__dirname, PROJECT_ID);
            if (!fs.existsSync(projectFolder)) {
                fs.mkdirSync(projectFolder, { recursive: true });
            }
            
            // For now, just move the zip file to project folder
            const newZipPath = path.join(projectFolder, zipFileName);
            fs.copyFileSync(zipFilePath, newZipPath);
            console.log(`📦 Moved ${zipFileName} to project folder: ${newZipPath}`);
            
        } catch (fallbackError) {
            console.error(`❌ Fallback extraction also failed: ${fallbackError.message}`);
        }
    }
}

// Alternative function using fetch (if you have Node.js 18+)
async function downloadFileFetch() {
    try {
        const url = 'https://api-stage-hyperexecute.lambdatestinternal.com/logistics/v1.0/project/01K24JP0D46K673H5W8MR8E37B/files/download';
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
                'authorization': 'Basic c2hyZXlhbnNoOTpMVF85UDBZWkNtODJrSWJkd0lFV2xVZzdUVmdMdFZjczdaQU1rYmpMU1RtZzk5SmRpZw==',
                'content-type': 'application/json',
                'origin': 'https://hyperexecute.lambdatest.com',
                'priority': 'u=1, i',
                'referer': 'https://hyperexecute.lambdatest.com/hyperexecute/projects/detail?projectId=01JE3VPZ00ZNVQ894P9PGEFV03',
                'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-site',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            },
            body: JSON.stringify({
                "files": [
                    {
                        "name": "payload.zip"
                    }
                ]
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Get filename from headers
        let filename = 'payload.zip';
        const contentDisposition = response.headers.get('content-disposition');
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+)"/);
            if (match) {
                filename = match[1];
            }
        }
        
        // Save file
        const filePath = path.join(__dirname, filename);
        const fileStream = fs.createWriteStream(filePath);
        
        await new Promise((resolve, reject) => {
            response.body.pipe(fileStream);
            response.body.on('error', reject);
            fileStream.on('finish', resolve);
        });
        
        console.log(`✅ File downloaded successfully: ${filename}`);
        console.log(`📁 Saved at: ${filePath}`);
        
    } catch (error) {
        console.error('❌ Download error:', error.message);
    }
}

// Function to set project ID dynamically
function setProjectId(newProjectId) {
    global.PROJECT_ID = newProjectId;
    global.API_PATH = `/logistics/v1.0/project/${newProjectId}/files/download`;
    console.log(`🔄 Project ID updated to: ${newProjectId}`);
}

// Function to show current configuration
function showConfig() {
    console.log('📋 Current Configuration:');
    console.log(`   Project ID: ${PROJECT_ID}`);
    console.log(`   Base URL: ${BASE_URL}`);
    console.log(`   API Path: ${API_PATH}`);
    console.log(`   Project Folder: ${path.join(__dirname, PROJECT_ID)}`);
}

// Run the download
console.log('🚀 Starting file download...');
console.log('='.repeat(50));

// Show current configuration
showConfig();
console.log('='.repeat(50));

// Use the https module version (works with all Node.js versions)
downloadFile();

// Uncomment below if you want to use fetch (Node.js 18+)
// downloadFileFetch();

// Example: Change project ID dynamically
// setProjectId('NEW_PROJECT_ID_123');
// downloadFile(); 