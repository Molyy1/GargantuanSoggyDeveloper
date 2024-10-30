const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Helper function to fetch base API
async function getBaseApi() {
    try {
        const response = await axios.get("https://raw.githubusercontent.com/Blankid018/D1PT0/main/baseApiUrl.json");
        return response.data.api;
    } catch (error) {
        console.error("Error fetching base API:", error);
        throw new Error("Base API fetch failed.");
    }
}

// Endpoint for handling music search and download
app.get('/sing', async (req, res) => {
    const { query } = req.query;
    const checkurl = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))((\w|-){11})(?:\S+)?$/;

    try {
        const baseApi = await getBaseApi();
        let videoID;

        if (checkurl.test(query)) {
            const match = query.match(checkurl);
            videoID = match[1];
        } else {
            const searchResult = (await axios.get(`${baseApi}/ytFullSearch?songName=${encodeURIComponent(query)}`)).data[0];
            if (!searchResult) return res.status(404).json({ message: "No results found." });
            videoID = searchResult.id;
        }

        const format = 'mp3';
        const filePath = path.join(__dirname, 'public', 'cache', `ytb_${format}_${videoID}.${format}`);
        if (!fs.existsSync(path.join(__dirname, 'public', 'cache'))) fs.mkdirSync(path.join(__dirname, 'public', 'cache'));

        const { data: { title, downloadLink, quality } } = await axios.get(`${baseApi}/ytDl3?link=${videoID}&format=${format}&quality=3`);
        
        await downloadFile(downloadLink, filePath);

        res.json({
            title: title,
            listenPath: `/cache/ytb_${format}_${videoID}.${format}`,
            downloadPath: `/cache/ytb_${format}_${videoID}.${format}`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred" });
    }
});

// Helper function to download the file
async function downloadFile(url, outputPath) {
    try {
        const response = await axios({ url, method: 'GET', responseType: 'arraybuffer' });
        fs.writeFileSync(outputPath, Buffer.from(response.data));
        console.log(`File saved at ${outputPath}`);
    } catch (error) {
        console.error("Download failed:", error);
        throw new Error("Unable to download file.");
    }
}

// Endpoint to serve cached audio files
app.get('/cache/:file', (req, res) => {
    const file = path.join(__dirname, 'public', 'cache', req.params.file);
    res.sendFile(file);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});