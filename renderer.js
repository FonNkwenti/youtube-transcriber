const { ipcRenderer, shell } = require('electron');

const urlInput = document.getElementById('urlInput');
const transcribeBtn = document.getElementById('transcribeBtn');
const statusMessage = document.getElementById('statusMessage');
const resultCard = document.getElementById('resultCard');
const videoTitle = document.getElementById('videoTitle');
const filePath = document.getElementById('filePath');
const transcriptText = document.getElementById('transcriptText');
const historyList = document.getElementById('historyList');
const openFileBtn = document.getElementById('openFileBtn');
const copyBtn = document.getElementById('copyBtn');

let currentFilePath = '';
let currentTranscript = '';

// Load history on startup
loadHistory();

transcribeBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) return;

    // Reset UI
    setStatus('Transcribing video... This may take a moment.', 'loading');
    resultCard.classList.add('hidden');
    transcribeBtn.disabled = true;

    try {
        const result = await ipcRenderer.invoke('transcribe-video', url);

        if (result.status === 'success') {
            setStatus('');
            showResult(result);
            await addToHistory(result);
        } else {
            console.error(result);
            setStatus(`Error: ${result.message}`, 'error');
        }
    } catch (err) {
        console.error(err);
        setStatus(`Unexpected Error: ${err.message}`, 'error');
    } finally {
        transcribeBtn.disabled = false;
    }
});

copyBtn.addEventListener('click', () => {
    if (currentTranscript) {
        navigator.clipboard.writeText(currentTranscript).then(() => {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Copied!</span>
            `;
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        });
    }
});

openFileBtn.addEventListener('click', () => {
    if (currentFilePath) {
        shell.showItemInFolder(currentFilePath);
    }
});

function setStatus(msg, type) {
    statusMessage.textContent = msg;
    statusMessage.className = 'status-message';
    if (type) statusMessage.classList.add(`status-${type}`);
}

function showResult(data) {
    videoTitle.textContent = data.title;
    filePath.textContent = `File saved to: ${data.file_path}`;
    
    // Display full transcript
    transcriptText.textContent = data.transcript_text || data.transcript_preview;
    currentTranscript = data.transcript_text || data.transcript_preview;
    currentFilePath = data.file_path;
    
    resultCard.classList.remove('hidden');
}

async function addToHistory(item) {
    const historyItem = {
        title: item.title,
        path: item.file_path,
        date: new Date().toISOString()
    };
    
    const updatedHistory = await ipcRenderer.invoke('save-history', historyItem);
    renderHistory(updatedHistory);
}

async function loadHistory() {
    const history = await ipcRenderer.invoke('get-history');
    renderHistory(history);
}

function renderHistory(items) {
    historyList.innerHTML = '';
    
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-title">${item.title}</div>
            <div class="history-path">${item.path}</div>
        `;
        div.addEventListener('click', () => {
            shell.showItemInFolder(item.path);
        });
        historyList.appendChild(div);
    });
}
