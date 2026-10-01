let currentMode = '';

// UI Navigation
function openCalculator(mode, modeName) {
    currentMode = mode;
    document.getElementById('screen-1').style.display = 'none';
    document.getElementById('screen-2').style.display = 'flex';
    document.getElementById('mode-title').innerText = `MODE: ${modeName}`;
    
    const inputElement = document.getElementById('math-input');
    inputElement.placeholder = "Enter exponent (e.g., 4)... and press Enter";
    inputElement.focus();
}

function goBack() {
    document.getElementById('screen-2').style.display = 'none';
    document.getElementById('screen-1').style.display = 'flex';
    document.getElementById('chat-box').innerHTML = ''; 
    document.getElementById('math-input').value = '';
}

// Input Handling
const inputField = document.getElementById('math-input');
const chatBox = document.getElementById('chat-box');

inputField.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        const query = this.value.trim();
        if (query === '') return;
        
        this.value = '';
        processQuery(query);
    }
});

function processQuery(query) {
    appendMessage(`User: ${query}`);
    appendMessage(`System: Thinking...`);

    setTimeout(() => {
        const result = processMathUniversal(query, currentMode);
        
        const sysContainer = document.createElement('div');
        sysContainer.className = 'message-row';
        const sysMsg = document.createElement('div');
        sysMsg.className = 'message';

        if (result.isError) {
            const randNum = Math.floor(Math.random() * (500 - 50 + 1)) + 50;
            sysMsg.innerHTML = `System: (<span class="error-text">Error ${randNum}:</span> Invalid Exponent) Please enter a valid integer exponent (e.g., 4 or -3).`;
        } else {
            sysMsg.innerHTML = `System:<br>${result.displayHTML}`;
            
            if (!result.hideDefaultCopy) {
                sysMsg.innerHTML += ` <button class="copy-btn" onclick="copyResult(this, '${result.copyText}')">📋 Copy Answer</button>`;
            }
        }
        
        sysContainer.appendChild(sysMsg);
        chatBox.appendChild(sysContainer);
        
        const separatorRow = document.createElement('div');
        separatorRow.className = 'message-row';
        const separator = document.createElement('div');
        separator.className = 'separator';
        separator.innerText = '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~';
        separatorRow.appendChild(separator);
        chatBox.appendChild(separatorRow);

        chatBox.scrollTop = chatBox.scrollHeight;
    }, 400);
}

function appendMessage(text) {
    const row = document.createElement('div');
    row.className = 'message-row';
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.innerText = text;
    row.appendChild(msg);
    chatBox.appendChild(row);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function copyResult(button, text) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = '✅ Copied!';
        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
    });
}

// --- MATH ENGINE FOR THE POWER OF I ---
function processMathUniversal(input, mode) {
    try {
        const cleanInput = input.trim();
        
        // Ensure the input is a valid integer
        if (!/^-?\d+$/.test(cleanInput)) {
            return { isError: true };
        }

        const exponent = parseInt(cleanInput, 10);

        // Modular arithmetic calculation modulo 4
        const mod = ((exponent % 4) + 4) % 4;
        let answer = '';

        switch (mod) {
            case 0:
                answer = '1';
                break;
            case 1:
                answer = 'i';
                break;
            case 2:
                answer = '-1';
                break;
            case 3:
                answer = '-i';
                break;
        }

        return {
            isError: false,
            hideDefaultCopy: false,
            displayHTML: `i<sup>${exponent}</sup> = <span class="highlight-text">${answer}</span>`,
            copyText: answer
        };
    } catch (e) {
        return { isError: true };
    }
}
