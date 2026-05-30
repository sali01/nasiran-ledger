/* ==========================================================================
   ⚙️ NASIRAN-E HUSAIN CLOUD PLATFORM - CORE OPERATIONS ENGINE
   ========================================================================== */

let cachedHeads = [];
let cachedDonors = [];

// 📅 AUTOMATED CALENDAR SYNCHRONIZATION DATA LINK
window.seedAutomaticSystemDates = function() {
    const today = new Date();
    const yyyy = today.getFullYear();
    let mm = today.getMonth() + 1; 
    let dd = today.getDate();

    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;

    const entryDateInput = document.getElementById('entry-date');
    if(entryDateInput) entryDateInput.value = `${yyyy}-${mm}-${dd}`;

    const firstDayStr = `${yyyy}-${mm}-01`;
    const lastDayStr = `${yyyy}-${mm}-${new Date(yyyy, today.getMonth() + 1, 0).getDate()}`;
    
    const rptFrom = document.getElementById('rpt-from-date');
    const rptTo = document.getElementById('rpt-to-date');
    if(rptFrom && rptTo) {
        rptFrom.value = firstDayStr;
        rptTo.value = lastDayStr;
    }
};

// 🔄 MATRIX RETRIEVAL ENGINE & UI CELL GENERATORS
window.fetchAndListenToCloudData = async function() {
    // 1. Fetch System Access Operators
    const { data: usersData } = await dbInstance.from('users').select('*');
    if (usersData) {
        const tbody = document.getElementById('tbl-users-body');
        if(tbody) {
            tbody.innerHTML = usersData.map(u => {
                const deleteUserBtn = window.globalUserRole === 'Admin' && u.email !== 'sshujaat.ali@hotmail.com'
                    ? `<td class="text-center admin-only"><button onclick="deleteSystemUser('${u.id}', '${u.email}')" class="btn btn-sm btn-outline-danger border-0 py-1 px-2" title="Delete User"><i class="fa-solid fa-trash-can"></i></button></td>`
                    : `<td class="text-center admin-only"></td>`;
                
                return `<tr><td><i class="fa-solid fa-envelope text-muted me-2"></i><strong>${u.email}</strong></td><td><span class="badge ${u.user_type === 'Admin'?'bg-danger':'bg-secondary'}">${u.user_type}</span></td>${deleteUserBtn}</tr>`;
            }).join('');
        }
    }

    // 2. Fetch Configured Accounting Classification Heads
    const { data: headsData } = await dbInstance.from('account_heads').select('*');
    if (headsData) {
        cachedHeads = headsData.map(h => ({ id: h.id, headName: h.head_name, headType: h.head_type }));
        
        const headsTable = document.getElementById('tbl-heads-body');
        if(headsTable) {
            headsTable.innerHTML = cachedHeads.map(h => {
                const deleteHeadBtn = window.globalUserRole === 'Admin'
                    ? `<td class="text-center admin-only"><button onclick="deleteAccountHead(${h.id}, '${h.headName}')" class="btn btn-sm btn-outline-danger border-0 py-1 px-2" title="Delete Head"><i class="fa-solid fa-trash-can"></i></button></td>`
                    : `<td class="text-center admin-only"></td>`;

                return `<tr><td><strong>${h.headName}</strong></td><td><span class="badge ${h.headType === 'Income'?'bg-success':'bg-warning text-dark'}">${h.headType}</span></td>${deleteHeadBtn}</tr>`;
            }).join('');
        }

        const rptSelect = document.getElementById('rpt-head-select');
        if(rptSelect) {
            rptSelect.innerHTML = '<option value="">-- View All Categories --</option>' +
                cachedHeads.map(h => `<option value="${h.headName}">${h.headName}</option>`).join('');
        }
        refreshDynamicHeadDropdown();
    }

    // 3. 🌐 RETRIEVE LIVE TRUST DONOR DATA PROFILES
    const { data: donorsData } = await dbInstance.from('donors').select('*').order('name', { ascending: true });
    if (donorsData) {
        cachedDonors = donorsData;
        const donorTbody = document.getElementById('tbl-donors-body');
        if (donorTbody) {
            donorTbody.innerHTML = donorsData.map(d => {
                const deleteBtn = window.globalUserRole === 'Admin'
                    ? `<td class="text-center admin-only"><button onclick="deleteTrustDonor(${d.id}, '${d.name}')" class="btn btn-sm btn-outline-danger border-0 py-1 px-2" title="Erase Profile"><i class="fa-solid fa-trash-can"></i></button></td>`
                    : '<td class="text-center admin-only"></td>';

                return `
                    <tr>
                        <td><strong>${d.name}</strong> <span class="badge bg-light text-dark ms-1" style="font-size:0.7rem;">${d.gender}</span></td>
                        <td>
                            <div class="small fw-semibold text-primary"><i class="fa-solid fa-phone me-1"></i>${d.mobile_number}</div>
                            <div class="small text-muted text-truncate" style="max-width:250px;"><i class="fa-solid fa-location-dot me-1"></i>${d.address || 'No Address Provided'}</div>
                        </td>
                        <td><code>${d.cnic || 'N/A'}</code></td>
                        ${deleteBtn}
                    </tr>
                `;
            }).join('');
        }
    }
    
    // Auto sync selection options inside transaction entry forms
    syncEntryFormDonorDropdown();

    // Safety visibility sync layer controls
    document.querySelectorAll('.admin-only').forEach(el => {
        if(window.globalUserRole === 'Admin') el.classList.remove('hidden');
        else el.classList.add('hidden');
    });
};

// 📥 DATA CAPTURE SUBMISSION ENDPOINTS (WRITE PIPELINES)
window.saveUserAccount = async function() {
    const email = document.getElementById('user-uid').value.trim();
    const pwd = document.getElementById('user-pwd').value;
    const role = document.getElementById('user-role').value;
    
    if(!email || pwd.length < 6) {
        return alert("Validation Error: Please provide a valid email and a password with at least 6 characters.");
    }
    
    const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
    const adminSessionBackup = localStorage.getItem(storageKey);

    const registerBtn = document.querySelector("button[onclick='saveUserAccount()']");
    const originalBtnHtml = registerBtn.innerHTML;
    registerBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-1"></i> Provisioning Securely...`;
    registerBtn.disabled = true;

    try {
        const { data, error } = await dbInstance.auth.signUp({ email: email, password: pwd });
        if (error) throw error;
        
        if (data && data.user) {
            const { error: dbError } = await dbInstance
                .from('users')
                .insert([{ id: data.user.id, email: email, user_type: role }]);
                
            if (dbError) throw dbError;
            
            alert(`🎉 Success! System Operator profile for "${email}" has been safely provisioned.`);
            document.getElementById('user-uid').value = ''; 
            document.getElementById('user-pwd').value = '';
        }
    } catch (err) {
        alert("⚠️ Provisioning Error: " + err.message);
    } finally {
        if (adminSessionBackup) {
            localStorage.setItem(storageKey, adminSessionBackup);
            await dbInstance.auth.getSession();
        }
        registerBtn.innerHTML = originalBtnHtml;
        registerBtn.disabled = false;
        fetchAndListenToCloudData();
    }
};

window.saveAccountHead = async function() {
    const name = document.getElementById('head-name').value.trim();
    const type = document.getElementById('head-type').value;
    if(!name) return alert("Title criteria empty.");
    
    const { error } = await dbInstance
        .from('account_heads')
        .insert([{ head_name: name, head_type: type }]);
        
    if(error) return alert("Error writing head: " + error.message);
    
    document.getElementById('head-name').value = '';
    fetchAndListenToCloudData();
};

/* ==========================================================================
   ⚙️ NASIRAN-E HUSAIN CLOUD PLATFORM - CORE OPERATIONS ENGINE (PHASE 1 PART B)
   ========================================================================== */

// Keep all your top global variables intact...
// (cachedHeads, seedAutomaticSystemDates, etc.)

/* ==========================================================================
   ⚙️ TRANSACTIONS ENTRY & PRINT ENGINE - PHASE 1 PART B (REFACTORED)
   ========================================================================== */
window.saveTransactionEntry = async function() {
    const entryDate = document.getElementById('entry-date').value;
    const entryType = document.getElementById('entry-type').value;
    const headName = document.getElementById('entry-head-select').value;
    const narration = document.getElementById('entry-narration').value;
    const amountVal = document.getElementById('entry-amount').value;
    
    // ✨ ROBUST DONOR DATA EXTRACTION FALLBACK ENGINE
    let donorId = null;
    let donorName = "General / Anonymous";
    let donorMobile = "";

    if (entryType === 'Income') {
        const donorSelect = document.getElementById('entry-donor-select');
        if (donorSelect && donorSelect.value !== "") {
            donorId = donorSelect.value;
            const selectedOption = donorSelect.options[donorSelect.selectedIndex];
            
            // Priority 1: Read from standard data-attributes
            let rawName = selectedOption.getAttribute('data-name');
            donorMobile = selectedOption.getAttribute('data-mobile') || "";

            // Priority 2 Fallback: If attributes are empty due to lag, parse text string "Name (Mobile)"
            if (!rawName) {
                const optionText = selectedOption.text;
                if (optionText.includes('(')) {
                    rawName = optionText.split('(')[0].trim();
                    // Extract mobile safely from inside parenthesis
                    if (!donorMobile) {
                        const match = optionText.match(/\(([^)]+)\)/);
                        if (match) donorMobile = match[1].trim();
                    }
                } else {
                    rawName = optionText.trim();
                }
            }
            donorName = rawName || "General / Anonymous";
        }
    }

    // 🛑 Granular Ledger Validation
    if (!entryDate || !headName || !amountVal || parseFloat(amountVal) <= 0) {
        alert("Please provide a valid voucher date, select an operational head, and specify an amount greater than zero.");
        return;
    }

    const transactionAmount = parseFloat(amountVal);

    try {
        // 1. Commit Payload to Database Schema via initialized window.dbInstance
        const { data, error } = await window.dbInstance
            .from('transactions')
            .insert([{
                date: entryDate,
                type: entryType,
                head_name: headName, // Adjusted key to match verified schema cache
                narration: narration,
                amount: transactionAmount,
                donor_id: donorId,
                entered_by: window.currentUserSession ? window.currentUserSession.email : 'system'
            }])
            .select();

        if (error) throw error;

        // Generate or grab reference Receipt Voucher Number
        const voucherId = (data && data[0]) ? data[0].id : Math.floor(100000 + Math.random() * 900000);

        alert(`🎉 Voucher successfully posted to Secure Cloud! [ID: NH-${String(voucherId).padStart(6, '0')}]`);

        // 2. ⚡ TRIGGER SUBSYSTEM CORE EXTENSIONS
        
        // Extension A: Generate 58mm Thermal Print Layout Data Matrix
        const thermalText = compileThermalReceiptString(voucherId, entryDate, entryType, headName, donorName, narration, transactionAmount);
        console.log("=== ESC/POS 58mm Thermal Output Stream ===");
        console.log(thermalText);
        
        // Handshake directly with hardware if Android web wrapper shell is active
        if (window.AndroidBluetoothPrinter) {
            window.AndroidBluetoothPrinter.printRawText(thermalText);
        } else {
            // Native fallback for desktop browser viewports
            triggerBrowserPrintFallback(thermalText);
        }

        // Extension B: Automate WhatsApp Notification Route
        if (entryType === 'Income' && donorMobile) {
            triggerWhatsAppNotification(voucherId, donorName, donorMobile, headName, transactionAmount, entryDate);
        }

        // 3. Reset Workspace UI Form Layout Inputs
        document.getElementById('entry-narration').value = '';
        document.getElementById('entry-amount').value = '';
        if (entryType === 'Income') {
            document.getElementById('entry-donor-select').selectedIndex = 0;
        }

    } catch (err) {
        console.error("Ledger Commit Fault:", err.message);
        alert("Critical failure committing record to cloud: " + err.message);
    }
};

/* ==========================================================================
   📟 EXTENSION A: 58mm BLUETOOTH THERMAL ESC/POS FORMATTING ENGINE
   ========================================================================== */
function compileThermalReceiptString(vId, date, type, head, donor, narration, amount) {
    const d = new Date(date);
    const formattedDate = `${d.getDate()}-${d.getMonth()+1}-${d.getFullYear()}`;
    const separator = "--------------------------------"; // Exactly 32 chars wide (Monospace 58mm standard grid)
    
    let text = "";
    text += "       NASIRAN-E HUSAIN        \n";
    text += "   ACCOUNTING LEDGER CLOUD     \n";
    text += "     Karachi, Sindh, PK        \n";
    text += separator + "\n";
    text += `Voucher ID : NH-${String(vId).padStart(6, '0')}\n`;
    text += `Date       : ${formattedDate}\n`;
    text += `Type       : ${type.toUpperCase()}\n`;
    text += separator + "\n";
    text += `Ledger Head:\n ${head}\n\n`;
    text += `Party/Donor:\n ${donor}\n\n`;
    text += `Description:\n ${narration || 'N/A'}\n`;
    text += separator + "\n";
    
    // Force clean right-alignment calculation for financial calculations
    const totalLabel = "TOTAL AMOUNT:";
    const priceStr = `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
    const spacesNeeded = 32 - (totalLabel.length + priceStr.length);
    const padding = spacesNeeded > 0 ? " ".repeat(spacesNeeded) : " ";
    
    text += `${totalLabel}${padding}${priceStr}\n`;
    text += separator + "\n";
    text += "   Thank you for your trust.   \n";
    text += "   System Generated Receipt    \n";
    text += "\n\n\n"; // Trailing paper feed spaces for crisp tear away
    
    return text;
}

function triggerBrowserPrintFallback(rawText) {
    const printWindow = window.open('', '_blank', 'width=350,height=500');
    if (printWindow) {
        printWindow.document.write(`
            <html>
            <head><title>Thermal Receipt Blueprint</title></head>
            <body style="font-family:monospace; white-space:pre; font-size:12px; padding:10px; background:#fff; color:#000;">
                ${rawText.replace(/\n/g, '<br>')}
                <script>window.onload = function() { window.print(); window.close(); }</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
}

/* ==========================================================================
   💬 EXTENSION B: AUTOMATED WHATSAPP TEXT GENERATION ENGINE
   ========================================================================== */
function triggerWhatsAppNotification(vId, donorName, mobile, headName, amount, date) {
    // Sanitize mobile layout parameters (strip symbols/dashes)
    let cleanMobile = mobile.replace(/[^0-9]/g, '');
    if (cleanMobile.startsWith('03')) {
        cleanMobile = '92' + cleanMobile.substring(1); // Format local Pakistani operators to global country codes
    }
    
    const d = new Date(date);
    const formattedDate = `${d.getDate()}-${d.getMonth()+1}-${d.getFullYear()}`;
    const formattedAmount = amount.toLocaleString('en-PK', { minimumFractionDigits: 0 });

    // Premium structured confirmation copy block
    const messageTemplate = 
`*NASIRAN-E HUSAIN TRUST*
_Acknowledgement of Contribution_
---------------------------------------
*Voucher ID:* NH-${String(vId).padStart(6, '0')}
*Date:* ${formattedDate}
*Received From:* ${donorName}

We gratefully acknowledge the receipt of your contribution towards our programs:

*Allocation:* ${headName}
*Total Amount:* PKR ${formattedAmount}/-

Thank you for your generous partnership and trust. May Almighty reward you abundantly.

_This is an automated system-generated cloud confirmation._`;

    const encodedMessage = encodeURIComponent(messageTemplate);
    const whatsappUrl = `https://wa.me/${cleanMobile}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
}
// 👥 DONOR DIRECTORY SUBSYSTEM PROTOCOLS
window.switchRegistryTab = function(activeTab) {
    const staffSec = document.getElementById('registry-staff-sec');
    const donorSec = document.getElementById('registry-donors-sec');
    const btnStaff = document.getElementById('btn-tab-staff');
    const btnDonors = document.getElementById('btn-tab-donors');

    if (!staffSec || !donorSec || !btnStaff || !btnDonors) return;

    if (activeTab === 'staff') {
        staffSec.classList.remove('hidden');
        donorSec.classList.add('hidden');
        btnStaff.className = "btn btn-primary px-4 fw-bold";
        btnDonors.className = "btn btn-outline-primary px-4 fw-bold";
    } else {
        donorSec.classList.remove('hidden');
        staffSec.classList.add('hidden');
        btnDonors.className = "btn btn-success px-4 fw-bold";
        btnStaff.className = "btn btn-outline-primary px-4 fw-bold";
    }
};

window.saveDonorProfile = async function() {
    const name = document.getElementById('donor-name').value.trim();
    const gender = document.getElementById('donor-gender').value;
    const cnic = document.getElementById('donor-cnic').value.trim();
    const mobile = document.getElementById('donor-mobile').value.trim();
    const address = document.getElementById('donor-address').value.trim();

    if (!name || !mobile) {
        return alert("Validation Check Failed: Name and Mobile Number fields are mandatory.");
    }

    try {
        const { error } = await dbInstance
            .from('donors')
            .insert([{
                name: name,
                gender: gender,
                cnic: cnic,
                mobile_number: mobile,
                address: address,
                entered_by: window.currentUserSession.email
            }]);

        if (error) throw error;

        alert(`🎉 Success! Donor profile for "${name}" has been mapped into the Trust Matrix.`);
        
        document.getElementById('donor-name').value = '';
        document.getElementById('donor-cnic').value = '';
        document.getElementById('donor-mobile').value = '';
        document.getElementById('donor-address').value = '';
        
        fetchAndListenToCloudData();
    } catch(err) {
        alert("Database Matrix Fault: " + err.message);
    }
};

function syncEntryFormDonorDropdown() {
    const container = document.getElementById('entry-donor-container');
    const selector = document.getElementById('entry-donor-select');
    const currentType = document.getElementById('entry-type').value;

    if (!container || !selector) return;

    if (currentType === 'Income') {
        container.classList.remove('hidden');
        selector.innerHTML = '<option value="">-- Anonymous / General Contributor --</option>' +
            cachedDonors.map(d => `<option value="${d.id}">${d.name} (${d.mobile_number})</option>`).join('');
    } else {
        container.classList.add('hidden');
        selector.innerHTML = '';
    }
}

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.app-page').forEach(page => {
        page.classList.add('hidden');
    });
    // Remove active styling from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Show selected page
    const activePage = document.getElementById(pageId);
    if (activePage) activePage.classList.remove('hidden');

    // Accentuate the active sidebar option
    const activeMenu = document.getElementById('menu-' + pageId);
    if (activeMenu) activeMenu.classList.add('active');
}


// 🛑 DROP/DELETE RECORD CRITERIA OVERRIDES
window.deleteTransactionVoucher = async function(transactionId) {
    const confirmAction = confirm("⚠️ Security Alert: Permanently delete this transaction voucher from the ledger?");
    if (!confirmAction) return;

    try {
        const { error } = await dbInstance.from('transactions').delete().eq('id', transactionId);
        if (error) throw error;
        alert("Voucher dropped successfully!");
        generatePeriodicReport();
    } catch (err) { alert("Access Denied: " + err.message); }
};

window.deleteAccountHead = async function(headId, headName) {
    const confirmAction = confirm(`⚠️ Danger Zone: Delete account head "${headName}"?`);
    if (!confirmAction) return;

    try {
        const { error } = await dbInstance.from('account_heads').delete().eq('id', headId);
        if (error) throw error;
        alert("Account head removed!");
        fetchAndListenToCloudData();
    } catch (err) { alert("Action Denied: " + err.message); }
};

window.deleteSystemUser = async function(userId, userEmail) {
    const confirmAction = confirm(`⚠️ Access Revocation: Delete user profile for "${userEmail}"?`);
    if (!confirmAction) return;

    try {
        const { error } = await dbInstance.from('users').delete().eq('id', userId);
        if (error) throw error;
        alert("User system profile dropped.");
        fetchAndListenToCloudData();
    } catch (err) { alert("Action Denied: " + err.message); }
};

window.deleteTrustDonor = async function(donorId, donorName) {
    const confirmAction = confirm(`⚠️ Security Alert: Are you sure you want to permanently erase the profile of "${donorName}"?`);
    if (!confirmAction) return;

    try {
        const { error } = await dbInstance.from('donors').delete().eq('id', donorId);
        if (error) throw error;
        alert("Donor profile cleared successfully.");
        fetchAndListenToCloudData();
    } catch (err) {
        alert("Access Denied: " + err.message);
    }
};

// 🗣️ AMOUNT TO WORDS CURRENCY TRANSLATOR
function convertAmountToWords(amount) {
    const num = Math.abs(Math.floor(amount));
    if (num === 0) return "Zero Rupees Only";

    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function numToWords(n, suffix) {
        let str = "";
        if (n > 19) { str += b[Math.floor(n / 10)] + " " + a[n % 10]; } 
        else { str += a[n]; }
        if (n) str += suffix;
        return str;
    }

    let words = "";
    words += numToWords(Math.floor(num / 10000000), "Crore ");
    words += numToWords(Math.floor((num / 100000) % 100), "Lakh ");
    words += numToWords(Math.floor((num / 1000) % 100), "Thousand ");
    words += numToWords(Math.floor((num / 100) % 10), "Hundred ");

    if (num > 100 && num % 100) words += "and ";
    words += numToWords(num % 100, "");

    return "Rupees " + words.trim() + " Only";
}

// 📊 HIGH-PERFORMANCE LEDGER MATRIX COMPILER
window.generatePeriodicReport = async function() {
    const fromDate = document.getElementById('rpt-from-date').value;
    const toDate = document.getElementById('rpt-to-date').value;
    const selectedHead = document.getElementById('rpt-head-select').value;

    if(!fromDate || !toDate) return alert("From Date and To Date filters are mandatory.");

    const tbody = document.getElementById('tbl-reports-body');
    tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-muted"><i class="fa-solid fa-spinner fa-spin me-2"></i>Optimizing Matrix...</td></tr>`;

    let queryBuilder = dbInstance
        .from('transactions')
        .select('id, date, type, head_name, narration, amount, entered_by')
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: false });

    if (selectedHead) { queryBuilder = queryBuilder.eq('head_name', selectedHead); }

    const { data: records, error } = await queryBuilder;
    if (error) return alert("Extraction Failed: " + error.message);
    
    let totalIncome = 0; let totalExpense = 0;
    const compiledRows = [];

    records.forEach((trans) => {
        const amt = parseFloat(trans.amount);
        if(trans.type === "Income") totalIncome += amt;
        else totalExpense += amt;

        const deleteButtonHtml = window.globalUserRole === 'Admin' 
            ? `<td class="text-center admin-only"><button onclick="deleteTransactionVoucher(${trans.id})" class="btn btn-sm btn-outline-danger border-0 py-1 px-2" title="Delete Voucher"><i class="fa-solid fa-trash-can"></i></button></td>` 
            : '';

        compiledRows.push(`
            <tr>
                <td><code>${trans.date}</code></td>
                <td><span class="badge ${trans.type==='Income'?'bg-success':'bg-danger'}">${trans.type}</span></td>
                <td><strong>${trans.head_name}</strong></td>
                <td><div>${trans.narration || ''}</div><div class="audit-badge"><i class="fa-solid fa-pen-fancy me-1"></i>by: ${trans.entered_by || 'System'}</div></td>
                <td class="text-end fw-bold ${trans.type==='Income'?'text-success':'text-danger'}">${trans.type==='Income'?'+':'-'}PKR ${amt.toFixed(2)}</td>
                ${deleteButtonHtml}
            </tr>
        `);
    });

    tbody.innerHTML = compiledRows.join('') || `<tr><td colspan="6" class="text-center p-4 text-muted">No records matched specified parameters.</td></tr>`;

    document.getElementById('lbl-rpt-income').innerText = `PKR ${totalIncome.toFixed(2)}`;
    document.getElementById('lbl-rpt-expense').innerText = `PKR ${totalExpense.toFixed(2)}`;

    const netBalance = totalIncome - totalExpense;
    document.getElementById('lbl-rpt-balance').innerText = `PKR ${netBalance.toFixed(2)}`;
    document.getElementById('lbl-rpt-words').innerText = convertAmountToWords(netBalance);

    const balanceCard = document.getElementById('card-rpt-balance');
    const balanceIcon = document.getElementById('icon-rpt-balance');

    if (netBalance >= 0) {
        balanceCard.style.background = "linear-gradient(135deg, #065f46 0%, #022c22 100%)";
        balanceIcon.className = "fa-solid fa-money-bill-trend-up fa-2x opacity-50";
    } else {
        balanceCard.style.background = "linear-gradient(135deg, #991b1b 0%, #450a0a 100%)";
        balanceIcon.className = "fa-solid fa-arrow-trend-down fa-2x opacity-50";
    }

    document.getElementById('report-metrics-row').classList.remove('hidden');
    document.getElementById('lbl-words-row').classList.remove('hidden');
    document.getElementById('report-results-container').classList.remove('hidden');
    
    document.querySelectorAll('.admin-only').forEach(el => {
        if(window.globalUserRole === 'Admin') el.classList.remove('hidden');
        else el.classList.add('hidden');
    });
};

window.refreshDynamicHeadDropdown = function() {
    const currentSelectedType = document.getElementById('entry-type').value;
    const dropDown = document.getElementById('entry-head-select');
    if(!dropDown) return;
    const filtered = cachedHeads.filter(h => h.headType === currentSelectedType);
    dropDown.innerHTML = filtered.map(h => `<option value="${h.headName}">${h.headName}</option>`).join('');
    
    syncEntryFormDonorDropdown();
};

window.showPage = function(pageId) {
    document.querySelectorAll('.app-page').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    const targetPage = document.getElementById(pageId);
    if(targetPage) targetPage.classList.remove('hidden');

    const tgtLink = document.getElementById(`menu-${pageId}`);
    if(tgtLink) tgtLink.classList.add('active');
};
