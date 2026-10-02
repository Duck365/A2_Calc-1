let currentMode = '';

// UI Navigation
function openCalculator(mode, modeName) {
    currentMode = mode;
    document.getElementById('screen-1').style.display = 'none';
    document.getElementById('screen-2').style.display = 'flex';
    document.getElementById('mode-title').innerText = `MODE: ${modeName}`;
    
    const inputElement = document.getElementById('math-input');
    if (mode === 'power_of_i') {
        inputElement.placeholder = "Enter exponent (e.g., 4)... and press Enter";
    } else {
        inputElement.placeholder = "Enter equation (e.g., 3a^2+9a=0)... and press Enter";
    }
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
            sysMsg.innerHTML = `System: (<span class="error-text">Error ${randNum}:</span> Invalid Input) Please check your equation format.`;
        } else {
            sysMsg.innerHTML = `System:<br>${result.displayHTML}`;
            
            if (!result.hideDefaultCopy) {
                sysMsg.innerHTML += `<br><button class="copy-btn" onclick="copyResult(this, '${result.copyText}')">📋 Copy Answer</button>`;
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

// Math Helper
function simplifyFraction(n, d) {
    if (n === 0) return "0";
    let sign = (n < 0) !== (d < 0) ? "-" : "";
    n = Math.abs(n);
    d = Math.abs(d);
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    let divisor = gcd(n, d);
    n /= divisor;
    d /= divisor;
    return d === 1 ? `${sign}${n}` : `${sign}${n}/${d}`;
}

// --- UNIVERSAL MATH ENGINE ---
function processMathUniversal(input, mode) {
    try {
        const cleanInput = input.trim();

        if (mode === 'power_of_i') {
            if (!/^-?\d+$/.test(cleanInput)) return { isError: true };
            const exponent = parseInt(cleanInput, 10);
            const mod = ((exponent % 4) + 4) % 4;
            let answer = ['1', 'i', '-1', '-i'][mod];
            return {
                isError: false,
                hideDefaultCopy: false,
                displayHTML: `i<sup>${exponent}</sup> = <span class="highlight-text">${answer}</span>`,
                copyText: answer
            };
        } 
        
        else if (mode === 'binomial_quad') {
            let A = 0, B = 0, C = 0, v = 'x';
            let match = cleanInput.match(/[a-zA-Z]/);
            if (match) v = match[0];

            let clean = cleanInput.replace(/\s+/g, '').replace(/²/g, '^2');
            let parts = clean.split('=');
            if (parts.length !== 2) parts = [clean, '0'];

            function parseSide(str, multiplier) {
                if (!str.startsWith('+') && !str.startsWith('-')) str = '+' + str;
                let termRegex = new RegExp(`([+-]\\d*${v}\\^2|[+-]\\d*${v}(?!\\^2)|[+-]\\d+)`, 'g');
                let terms = str.match(termRegex);
                if (terms) {
                    terms.forEach(term => {
                        if (term.includes(`${v}^2`)) {
                            let coef = term.replace(`${v}^2`, '');
                            A += (coef === '+' || coef === '') ? multiplier : (coef === '-' ? -multiplier : parseInt(coef) * multiplier);
                        } else if (term.includes(v)) {
                            let coef = term.replace(v, '');
                            B += (coef === '+' || coef === '') ? multiplier : (coef === '-' ? -multiplier : parseInt(coef) * multiplier);
                        } else {
                            C += parseInt(term) * multiplier;
                        }
                    });
                }
            }
            
            parseSide(parts[0], 1);
            parseSide(parts[1], -1);

            if (A === 0) return { isError: true };

            let steps = [];
            steps.push(`${cleanInput}`);

            // GCF Factoring Method (e.g., 3a^2 + 9a = 0)
            if (B !== 0 && C === 0) {
                let eqStr = `${A === 1 ? '' : (A === -1 ? '-' : A)}${v}^2`;
                eqStr += `${B > 0 ? '+' : ''}${B === 1 ? '' : (B === -1 ? '-' : B)}${v}=0`;
                
                if (cleanInput.replace(/\s+/g,'') !== eqStr && !cleanInput.includes('²')) {
                     steps.push(`${eqStr}`);
                }

                const gcdHelper = (x, y) => {
                    x = Math.abs(x); y = Math.abs(y);
                    while(y) { let t = y; y = x % y; x = t; }
                    return x;
                };
                let g = gcdHelper(A, B);
                if (A < 0) g = -g;

                let f1_coef = g;
                let f1_str = (f1_coef === 1 ? '' : (f1_coef === -1 ? '-' : f1_coef)) + v;
                
                let f2_A = A / g;
                let f2_B = B / g;
                let f2_str = (f2_A === 1 ? '' : (f2_A === -1 ? '-' : f2_A)) + v + (f2_B > 0 ? '+' : '') + f2_B;

                steps.push(`${f1_str}(${f2_str})=0 <span class="highlight-text">(It's pulling out the GCF)</span>`);
                steps.push(`${f1_str}=0 <span class="highlight-text">(It's setting each factor to zero)</span>`);
                steps.push(`${f2_str}=0`);
                
                if (f1_coef !== 1 && f1_coef !== -1) {
                     steps.push(`${v}=0 <span class="highlight-text">(It's dividing by ${f1_coef})</span>`);
                } else {
                     steps.push(`${v}=0`);
                }

                let ans2 = simplifyFraction(-f2_B, f2_A);
                steps.push(`${v}=${ans2} <span class="highlight-text">(Then, it states the answer)</span>`);

                return {
                    isError: false,
                    hideDefaultCopy: false,
                    displayHTML: steps.join('<br>'),
                    copyText: `${v}=0, ${v}=${ans2}`
                };
            } 
            // Square Root Method (e.g., 25b^2 = 1)
            else if (B === 0 && C !== 0) {
                steps.push(`${A}${v}^2 = ${-C} <span class="highlight-text">(Isolating the squared term)</span>`);
                let rightSide = simplifyFraction(-C, A);
                
                if (A !== 1) {
                    steps.push(`${v}^2 = ${rightSide} <span class="highlight-text">(Dividing by ${A})</span>`);
                }
                
                let num = -C, den = A;
                if (num * den < 0) {
                    steps.push(`${v} = ±√(${rightSide}) <span class="highlight-text">(No real solution)</span>`);
                    return { isError: false, displayHTML: steps.join('<br>'), copyText: "No real solution" };
                }
                
                let gcd = (x, y) => y ? gcd(y, x % y) : Math.abs(x);
                let div = gcd(Math.abs(num), Math.abs(den));
                num /= div; den /= div;
                
                if (Math.sqrt(num) % 1 === 0 && Math.sqrt(den) % 1 === 0) {
                    let finalAns = simplifyFraction(Math.sqrt(num), Math.sqrt(den));
                    steps.push(`${v} = ±${finalAns} <span class="highlight-text">(Taking the square root to find the answer)</span>`);
                    return { isError: false, hideDefaultCopy: false, displayHTML: steps.join('<br>'), copyText: `±${finalAns}` };
                } else {
                     steps.push(`${v} = ±√(${rightSide}) <span class="highlight-text">(Taking the square root to find the answer)</span>`);
                     return { isError: false, hideDefaultCopy: false, displayHTML: steps.join('<br>'), copyText: `±√(${rightSide})` };
                }
            } else {
                return { isError: true };
            }
        }
    } catch (e) {
        return { isError: true };
    }
}
