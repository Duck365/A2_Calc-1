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
    } else if (mode === 'complex_ops') {
        inputElement.placeholder = "Enter expression (e.g., (3+4i)+(7+11i))...";
    } else {
        inputElement.placeholder = "Enter quadratic equation (e.g., x^2+5x+6=0)...";
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
            sysMsg.innerHTML = `System: (<span class="error-text">Error ${randNum}:</span> Parsing Failed) Check the equation format.`;
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

// Math Helpers
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

function formatFactor(coef, constVal, v) {
    let term = (coef === 1) ? v : ((coef === -1) ? `-${v}` : `${coef}${v}`);
    if (constVal === 0) return term;
    let sign = constVal > 0 ? '+' : '-';
    return `${term}${sign}${Math.abs(constVal)}`;
}

// --- UNIVERSAL MATH ENGINE ---
function processMathUniversal(input, mode) {
    try {
        const cleanInput = input.trim();

        if (mode === 'complex_ops') {
            // Remove spaces and normalize isolated "i" to "1i"
            let clean = cleanInput.replace(/\s+/g, '');
            clean = clean.replace(/\+i\)/g, '+1i)').replace(/\-i\)/g, '-1i)');
            
            const complexRegex = /^\((-?\d+)([+-]\d+)i\)([+-])?\((-?\d+)([+-]\d+)i\)$/;
            let match = clean.match(complexRegex);
            
            if (!match) return { isError: true };

            let a1 = parseInt(match[1]);
            let b1 = parseInt(match[2]);
            let op = match[3] || '*'; // If no operator, assume multiplication
            let a2 = parseInt(match[4]);
            let b2 = parseInt(match[5]);

            let steps = [];
            steps.push(`${cleanInput}`);

            // Addition and Subtraction
            if (op === '+' || op === '-') {
                let realPart = op === '+' ? a1 + a2 : a1 - a2;
                let imagPart = op === '+' ? b1 + b2 : b1 - b2;
                
                let a2_str = (a2 < 0 && op === '-') ? `(${a2})` : a2;
                let b2_str = (b2 < 0 && op === '-') ? `(${b2}i)` : `${b2}i`;
                
                steps.push(`(${a1} ${op} ${a2_str}) + (${b1}i ${op} ${b2_str})`);
                
                let imagStr = imagPart >= 0 ? `+${imagPart}i` : `${imagPart}i`;
                let finalAns = `${realPart}${imagStr}`;
                steps.push(finalAns);
                
                return {
                    isError: false,
                    hideDefaultCopy: false,
                    displayHTML: steps.join('<br>'),
                    copyText: finalAns
                };
            } 
            // Multiplication (FOIL)
            else if (op === '*') {
                let first = a1 * a2;
                let outer = a1 * b2;
                let inner = b1 * a2;
                let last = b1 * b2;
                
                let outerStr = outer >= 0 ? `+ ${outer}` : `- ${Math.abs(outer)}`;
                let innerStr = inner >= 0 ? `+ ${inner}` : `- ${Math.abs(inner)}`;
                let lastStr = last >= 0 ? `+ ${last}` : `- ${Math.abs(last)}`;
                
                steps.push(`${first} ${outerStr}i ${innerStr}i ${lastStr}i^2`);
                
                let midSum = outer + inner;
                let midStr = midSum >= 0 ? `+ ${midSum}` : `- ${Math.abs(midSum)}`;
                
                steps.push(`${first} ${midStr}i ${lastStr}(-1)`);
                
                let newLast = -last;
                let newLastStr = newLast >= 0 ? `+ ${newLast}` : `- ${Math.abs(newLast)}`;
                
                steps.push(`${first} ${midStr}i ${newLastStr}`);
                
                let finalReal = first + newLast;
                let finalAns = `${finalReal}${midSum >= 0 ? '+' : ''}${midSum}i`;
                
                steps.push(finalAns);
                
                return {
                    isError: false,
                    hideDefaultCopy: false,
                    displayHTML: steps.join('<br>'),
                    copyText: finalAns
                };
            }
        }

        else if (mode === 'power_of_i') {
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

            const gcdHelper = (x, y) => {
                x = Math.abs(x); y = Math.abs(y);
                while(y) { let t = y; y = x % y; x = t; }
                return x;
            };

            // CASE 1: GCF Factoring
            if (B !== 0 && C === 0) {
                let eqStr = `${A === 1 ? '' : (A === -1 ? '-' : A)}${v}^2${B > 0 ? '+' : ''}${B === 1 ? '' : (B === -1 ? '-' : B)}${v}=0`;
                if (cleanInput.replace(/\s+/g,'') !== eqStr && !cleanInput.includes('²')) {
                     steps.push(`${eqStr}`);
                }

                let g = gcdHelper(A, B);
                if (A < 0) g = -g;

                let f1_coef = g;
                let f1_str = (f1_coef === 1 ? '' : (f1_coef === -1 ? '-' : f1_coef)) + v;
                
                let f2_A = A / g;
                let f2_B = B / g;
                let f2_str = formatFactor(f2_A, f2_B, v);

                steps.push(`${f1_str}(${f2_str})=0`);
                
                steps.push(`${f1_str}=0`);
                steps.push(`${v}=0`);

                steps.push(`${f2_str}=0`);
                let ans2 = simplifyFraction(-f2_B, f2_A);
                steps.push(`${v}=${ans2}`);

                return {
                    isError: false,
                    hideDefaultCopy: false,
                    displayHTML: steps.join('<br>'),
                    copyText: `${v}=0, ${v}=${ans2}`
                };
            } 

            // CASE 2: Difference of Squares
            else if (B === 0 && C !== 0) {
                let eqStr = `${A === 1 ? '' : (A === -1 ? '-' : A)}${v}^2${C > 0 ? '+' : ''}${C}=0`;
                if (cleanInput.replace(/\s+/g,'') !== eqStr) steps.push(`${eqStr}`);

                if (A * C > 0) return { isError: false, displayHTML: steps.join('<br>') + "<br>No real solution", copyText: "No real solution" };

                let g = gcdHelper(A, C);
                if (A < 0) g = -g;

                let a_term = A / g, c_term = C / g; 
                let sqrtA = Math.sqrt(Math.abs(a_term));
                let sqrtC = Math.sqrt(Math.abs(c_term));

                if (sqrtA % 1 === 0 && sqrtC % 1 === 0) {
                    let f1_str = formatFactor(sqrtA, -sqrtC, v);
                    let f2_str = formatFactor(sqrtA, sqrtC, v);
                    let g_str = g === 1 ? '' : (g === -1 ? '-' : g.toString());

                    steps.push(`${g_str}(${f1_str})(${f2_str})=0`);

                    steps.push(`${f1_str}=0`);
                    let ans1 = simplifyFraction(sqrtC, sqrtA);
                    steps.push(`${v}=${ans1}`);

                    steps.push(`${f2_str}=0`);
                    let ans2 = simplifyFraction(-sqrtC, sqrtA);
                    steps.push(`${v}=${ans2}`);

                    return {
                        isError: false,
                        hideDefaultCopy: false,
                        displayHTML: steps.join('<br>'),
                        copyText: `${v}=${ans1}, ${v}=${ans2}`
                    };
                }
            }

            // CASE 3: Trinomials
            else if (B !== 0 && C !== 0) {
                let eqStr = `${A === 1 ? '' : (A === -1 ? '-' : A)}${v}^2${B > 0 ? '+' : ''}${B === 1 ? '' : (B === -1 ? '-' : B)}${v}${C > 0 ? '+' : ''}${C}=0`;
                if (cleanInput.replace(/\s+/g,'') !== eqStr) steps.push(`${eqStr}`);

                let g = gcdHelper(A, gcdHelper(B, C));
                if (A < 0) g = -g;

                let a1 = A / g, b1 = B / g, c1 = C / g;
                let targetMult = a1 * c1, targetAdd = b1;
                let f1 = null, f2 = null;

                let limit = Math.abs(targetMult);
                for (let i = -limit; i <= limit; i++) {
                    if (i === 0) continue;
                    if (targetMult % i === 0) {
                        let j = targetMult / i;
                        if (i + j === targetAdd) {
                            f1 = i; f2 = j; break;
                        }
                    }
                }

                if (f1 === null) return { isError: true };

                let gcd1 = gcdHelper(a1, f1);
                let t1_a = a1 / gcd1, t1_c = f1 / gcd1;

                let gcd2 = gcdHelper(a1, f2);
                let t2_a = a1 / gcd2, t2_c = f2 / gcd2;

                let f1_str = formatFactor(t1_a, t1_c, v);
                let f2_str = formatFactor(t2_a, t2_c, v);
                let g_str = g === 1 ? '' : (g === -1 ? '-' : g.toString());

                steps.push(`${g_str}(${f1_str})(${f2_str})=0`);

                steps.push(`${f1_str}=0`);
                let ans1 = simplifyFraction(-t1_c, t1_a);
                steps.push(`${v}=${ans1}`);

                steps.push(`${f2_str}=0`);
                let ans2 = simplifyFraction(-t2_c, t2_a);
                steps.push(`${v}=${ans2}`);

                return {
                    isError: false,
                    hideDefaultCopy: false,
                    displayHTML: steps.join('<br>'),
                    copyText: `${v}=${ans1}, ${v}=${ans2}`
                };
            }

            return { isError: true };
        }
    } catch (e) {
        return { isError: true };
    }
}
