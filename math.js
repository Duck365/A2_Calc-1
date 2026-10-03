let currentMode = '';

// UI Navigation
function openCalculator(mode, modeName) {
    currentMode = mode;
    document.getElementById('screen-1').style.display = 'none';
    document.getElementById('screen-2').style.display = 'flex';
    document.getElementById('mode-title').innerText = `MODE: ${modeName}`;
    
    const inputElement = document.getElementById('math-input');
    if (mode === 'power_of_i_basic') {
        inputElement.placeholder = "Enter exponent (e.g., 4)...";
    } else if (mode === 'power_of_i') {
        inputElement.placeholder = "Enter expression (e.g., 7i^60 + 4i^99 - 11i^106)...";
    } else if (mode === 'complex_ops') {
        inputElement.placeholder = "Enter expression (e.g., (3+4i)+(7+11i))...";
    } else if (mode === 'simplify_radicals') {
        inputElement.placeholder = "Enter radical (e.g., \\sqrt{-48} or sqrt(-5)+2)...";
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
            sysMsg.innerHTML = `System: (<span class="error-text">Error ${randNum}:</span> Parsing Failed) Check the format.`;
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

        if (mode === 'simplify_radicals') {
            let clean = cleanInput.replace(/\s+/g, '');
            
            clean = clean.replace(/\\sqrt\{?(-?\d+)\}?/g, 'sqrt($1)');
            clean = clean.replace(/√\({0,1}(-?\d+)\){0,1}/g, 'sqrt($1)');

            let steps = [];
            steps.push(`${cleanInput}`);

            let simplified = clean.replace(/sqrt\((-?\d+)\)/g, (match, numStr) => {
                let n = parseInt(numStr, 10);
                if (n === 0) return '0';
                
                let isNegative = n < 0;
                let absN = Math.abs(n);
                
                let maxSquare = 1;
                for (let i = 1; i * i <= absN; i++) {
                    if (absN % (i * i) === 0) {
                        maxSquare = i;
                    }
                }
                
                let remainder = absN / (maxSquare * maxSquare);
                let coeff = maxSquare === 1 ? '' : maxSquare;
                
                if (isNegative) {
                    if (remainder === 1) return `${coeff === '' ? '' : coeff}i`;
                    return `${coeff}i√${remainder}`;
                } else {
                    if (remainder === 1) return `${maxSquare}`;
                    return `${coeff}√${remainder}`;
                }
            });

            let finalAns = simplified;
            let swapMatch = finalAns.match(/^([+-]?\d*i(?:√\d+)?)([+-]\d+)$/);
            if (swapMatch) {
                let imag = swapMatch[1];
                let real = swapMatch[2];
                if (real.startsWith('+')) {
                    finalAns = `${real.substring(1)}${imag.startsWith('-') ? imag : '+' + imag}`;
                } else {
                    finalAns = `${real}${imag.startsWith('-') ? imag : '+' + imag}`;
                }
            }

            finalAns = finalAns.replace(/^\+/, '');
            steps.push(finalAns);

            return {
                isError: false,
                hideDefaultCopy: false,
                displayHTML: steps.join('<br>'),
                copyText: finalAns
            };
        }

        else if (mode === 'complex_ops') {
            let clean = cleanInput.replace(/\s+/g, '');
            clean = clean.replace(/\+i\)/g, '+1i)').replace(/\-i\)/g, '-1i)');
            
            const complexRegex = /^\((-?\d+)([+-]\d+)i\)([+-])?\((-?\d+)([+-]\d+)i\)$/;
            let match = clean.match(complexRegex);
            
            if (!match) return { isError: true };

            let a1 = parseInt(match[1]);
            let b1 = parseInt(match[2]);
            let op = match[3] || '*'; 
            let a2 = parseInt(match[4]);
            let b2 = parseInt(match[5]);

            let steps = [];
            steps.push(`${cleanInput}`);

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

        else if (mode === 'power_of_i_basic') {
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
        
        else if (mode === 'power_of_i') {
            let clean = cleanInput.replace(/\s+/g, '');
            let terms = clean.match(/[+-]?[^+-]+/g);
            if (!terms) return { isError: true };

            let realPart = 0;
            let imagPart = 0;
            
            let step1 = []; // Substitutions
            let step2 = []; // Simplified combinations

            terms.forEach((term, index) => {
                let hasI = term.includes('i');
                let parts = term.split('i');
                let coefStr = parts[0];
                let coef = 1;
                
                if (coefStr === '+' || coefStr === '') coef = 1;
                else if (coefStr === '-') coef = -1;
                else coef = parseInt(coefStr, 10);

                let displayCoef = Math.abs(coef);
                let sign = coef >= 0 ? (index === 0 ? '' : '+ ') : '- ';
                if (index === 0 && coef < 0) sign = '-';
                
                if (hasI) {
                    let expMatch = term.match(/i\^(\d+)/);
                    let exp = expMatch ? parseInt(expMatch[1], 10) : 1;
                    let mod = exp % 4;
                    
                    let iVals = ['1', 'i', '-1', '-i'];
                    let subVal = iVals[mod];
                    
                    // Display coefficient implicitly if it's 1 or -1
                    let displayTermStr = (displayCoef === 1) ? `(${subVal})` : `${displayCoef}(${subVal})`;
                    step1.push(`${sign}${displayTermStr}`);
                    
                    let evalReal = 0;
                    let evalImag = 0;
                    if (mod === 0) evalReal = coef;
                    else if (mod === 1) evalImag = coef;
                    else if (mod === 2) evalReal = -coef;
                    else if (mod === 3) evalImag = -coef;
                    
                    realPart += evalReal;
                    imagPart += evalImag;
                    
                    if (evalReal !== 0) {
                        let s = evalReal >= 0 ? (step2.length === 0 ? '' : '+ ') : '- ';
                        if (step2.length === 0 && evalReal < 0) s = '-';
                        step2.push(`${s}${Math.abs(evalReal)}`);
                    } else if (evalImag !== 0) {
                        let s = evalImag >= 0 ? (step2.length === 0 ? '' : '+ ') : '- ';
                        if (step2.length === 0 && evalImag < 0) s = '-';
                        let valStr = Math.abs(evalImag) === 1 ? 'i' : `${Math.abs(evalImag)}i`;
                        step2.push(`${s}${valStr}`);
                    }
                } else {
                    realPart += coef;
                    step1.push(`${sign}${displayCoef}`);
                    let s = coef >= 0 ? (step2.length === 0 ? '' : '+ ') : '- ';
                    if (step2.length === 0 && coef < 0) s = '-';
                    step2.push(`${s}${Math.abs(coef)}`);
                }
            });

            let finalAns = '';
            if (realPart === 0 && imagPart === 0) finalAns = '0';
            else if (realPart === 0) {
                if (imagPart === 1) finalAns = 'i';
                else if (imagPart === -1) finalAns = '-i';
                else finalAns = `${imagPart}i`;
            }
            else if (imagPart === 0) finalAns = `${realPart}`;
            else {
                let imagSign = imagPart > 0 ? '+' : '-';
                let absImag = Math.abs(imagPart);
                let imagStr = absImag === 1 ? 'i' : `${absImag}i`;
                finalAns = `${realPart}${imagSign}${imagStr}`;
            }

            let steps = [];
            steps.push(cleanInput);
            steps.push(step1.join(' '));
            steps.push(step2.join(' '));
            steps.push(`<strong>${finalAns}</strong>`);

            return {
                isError: false,
                hideDefaultCopy: false,
                displayHTML: steps.join('<br>'),
                copyText: finalAns
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
                } else {
                    // If not perfect squares, isolate x^2 and take the square root
                    steps.push(`${A === 1 ? '' : (A === -1 ? '-' : A)}${v}^2=${-C}`);
                    
                    let val = -C / A;
                    let ansText = '';
                    
                    if (A !== 1 && A !== -1 && -C % A !== 0) {
                        let frac = simplifyFraction(-C, A);
                        steps.push(`${v}^2=${frac}`);
                        steps.push(`${v}=±√(${frac})`);
                        ansText = `${v}=±√(${frac})`;
                    } else {
                        if (A !== 1 && A !== -1) steps.push(`${v}^2=${val}`);
                        steps.push(`${v}=±√${val}`);
                        ansText = `${v}=±√${val}`;
                    }

                    return {
                        isError: false,
                        hideDefaultCopy: false,
                        displayHTML: steps.join('<br>'),
                        copyText: ansText
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

                // If factoring fails, use the Quadratic Formula
                if (f1 === null) {
                    steps.push(`<br><em>Cannot be easily factored. Using Quadratic Formula:</em>`);
                    steps.push(`${v} = (-b ± √(b² - 4ac)) / 2a`);
                    steps.push(`${v} = (-(${B}) ± √(${B}² - 4(${A})(${C}))) / 2(${A})`);
                    
                    let discriminant = (B * B) - (4 * A * C);
                    let denominator = 2 * A;
                    
                    steps.push(`${v} = (${-B} ± √(${discriminant})) / ${denominator}`);
                    
                    let ansText = '';
                    
                    if (discriminant < 0) {
                        let absDesc = Math.abs(discriminant);
                        let sqrtVal = Math.sqrt(absDesc);
                        
                        // If the imaginary part is a perfect square
                        if (sqrtVal % 1 === 0) {
                            ansText = `${v} = (${-B} ± ${sqrtVal}i) / ${denominator}`;
                        } else {
                            ansText = `${v} = (${-B} ± i√${absDesc}) / ${denominator}`;
                        }
                    } else {
                        let sqrtVal = Math.sqrt(discriminant);
                        // If it's real but irrational
                        if (sqrtVal % 1 !== 0) {
                            ansText = `${v} = (${-B} ± √${discriminant}) / ${denominator}`;
                        }
                    }
                    
                    steps.push(`<strong>${ansText}</strong>`);
                    
                    return {
                        isError: false,
                        hideDefaultCopy: false,
                        displayHTML: steps.join('<br>'),
                        copyText: ansText
                    };
                }

                // If factoring succeeds, continue with grouping
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
