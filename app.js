/* ==========================================================================
   ⚙️ CORE TRANSACTION ENGINE & FUNCTIONAL LOGIC CONTROLLERS
   ========================================================================== */

let cachedHeads = [];

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
    
    // 1. 💾 THE ADMIN SHIELD: Memorize your active Admin session tokens from local storage
    const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
    const adminSessionBackup = localStorage.getItem(storageKey);

    // Show a quick visual cue so the admin knows processing is happening
    const registerBtn = document.querySelector("button[onclick='saveUserAccount()']");
    const originalBtnHtml = registerBtn.innerHTML;
    registerBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-1"></i> Provisioning Securely...`;
    registerBtn.disabled = true;

    try {
        // 2. Register the secondary user account in the secure Auth layer
        const { data, error } = await dbInstance.auth.signUp({ 
            email: email, 
            password: pwd,
            options: {
                // Tells Supabase not to auto-confirm if email confirmation settings change
                emailRedirectTo: window.location.href 
            }
        });
        
        if (error) throw error;
        
        // 3. Write their matching user profile row into your Public Data Table
        if (data && data.user) {
            const { error: dbError } = await dbInstance
                .from('users')
                .insert([{ 
                    id: data.user.id, 
                    email: email, 
                    user_type: role 
                }]);
                
            if (dbError) throw dbError;
            
            alert(`🎉 Success! Account for "${email}" has been successfully provisioned.`);
            
            // Clear input fields for the next entry
            document.getElementById('user-uid').value = ''; 
            document.getElementById('user-pwd').value = '';
        }
    } catch (err) {
        alert("⚠️ Provisioning Error: " + err.message);
    } finally {
        // 4. 🛡️ RESTORE MASTER AUTHORITY: Forcefully re-inject your Admin session tokens
        if (adminSessionBackup) {
            localStorage.setItem(storageKey, adminSessionBackup);
            // Re-prime the Supabase client memory cache instantly with your Admin session
            await dbInstance.auth.getSession();
        }

        // Restore button state and refresh the live screen grids smoothly
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

window.saveTransactionEntry = async function() {
    const date = document.getElementById('entry-date').value;
    const type = document.getElementById('entry-type').value;
    const head = document.getElementById('entry-head-select').value;
    const narration = document.getElementById('entry-narration').value.trim();
    const amount = parseFloat(document.getElementById('entry-amount').value);

    if(!date || !head || isNaN(amount)) return alert("Please verify all data inputs are complete.");

    const { error } = await dbInstance
        .from('transactions')
        .insert([{
            date: date,
            type: type,
            head_name: head,
            narration: narration,
            amount: amount,
            entered_by: window.currentUserSession.email
        }]);

    if (error) return alert("Post action denied: " + error.message);
    
    alert("Voucher Posted Successfully!");
    document.getElementById('entry-narration').value = '';
    document.getElementById('entry-amount').value = '';
};

// 🛑 DELETION MANAGEMENT SYSTEMS
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

// 🗣️ METRIC TEXT CONVERSION ALGORITHM
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

// 📊 PERFORMANCE REINFORCED STATEMENT CALCULATOR
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
};

window.showPage = function(pageId) {
    document.querySelectorAll('.app-page').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    const targetPage = document.getElementById(pageId);
    if(targetPage) targetPage.classList.remove('hidden');

    const tgtLink = document.getElementById(`menu-${pageId}`);
    if(tgtLink) tgtLink.classList.add('active');
};