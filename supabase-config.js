/* ==========================================================================
   🔒 SECURITY ARCHITECTURE - SUPABASE REALTIME DATALINK SYSTEM CONNECTOR
   ========================================================================== */

const SUPABASE_URL = "https://nyhitutrfczvaolaaszx.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aGl0dXRyZmN6dmFvbGFhc3p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMzI5NjQsImV4cCI6MjA5NDkwODk2NH0.hU41TmqWCLGJoaTI0BDYLQxP72xvzn6x4buorfRT8zw";

let dbInstance = null;

try {
    window.dbInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    dbInstance = window.dbInstance; // Keeps internal file references happy!

    testSupabaseConnection();
} catch(error) {
    console.error("Initialization issue:", error);
    updateConnectionBadge(false);
}

// 🌐 CLOUD HANDSHAKE VERIFICATION ENGINE
async function testSupabaseConnection() {
    try {
        const { error } = await dbInstance.from('account_heads').select('id').limit(1);
        if (error && error.code !== 'PGRST116') throw error; 
        updateConnectionBadge(true);
    } catch(err) {
        console.error("Connection failed:", err);
        updateConnectionBadge(false);
    }
}

function updateConnectionBadge(isSuccess) {
    const badge = document.getElementById('db-status-badge');
    if(!badge) return;
    if(isSuccess) {
        badge.className = "d-inline-block px-3 py-1 rounded-pill small fw-bold text-success bg-success-subtle";
        badge.innerHTML = `<i class="fa-solid fa-cloud-check me-1"></i> Supabase Cloud Connected`;
        
        // 🔓 UNLOCK INTERFACE ACCESSIBILITY
        const loginBtn = document.getElementById('btn-login');
        if (loginBtn) {
            loginBtn.disabled = false;
        }
    } else {
        badge.className = "d-inline-block px-3 py-1 rounded-pill small fw-bold text-danger bg-danger-subtle";
        badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation me-1"></i> Connection Error`;
    }
}

// 🔑 AUTHENTICATION STRATEGY ROUTINES
window.handleSystemLogin = async function() {
    const email = document.getElementById('login-uid').value.trim();
    const password = document.getElementById('login-pwd').value;
    
    if(!email || !password) return alert("Please fill out all credential blocks.");
    
    const loginBtn = document.getElementById('btn-login');
    const originalBtnText = loginBtn.innerHTML;
    loginBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin me-1"></i> Verifying...`;
    loginBtn.disabled = true;

    try {
        const { data, error } = await dbInstance.auth.signInWithPassword({ email, password });
        if (error) throw error;
    } catch (err) {
        alert("Access Failure: " + err.message);
        loginBtn.innerHTML = originalBtnText;
        loginBtn.disabled = false;
    }
};

window.handleLogout = async function() { 
    await dbInstance.auth.signOut(); 
};

// 🔄 GLOBAL AUTHENTICATION STATE CHANGE LISTENER
dbInstance.auth.onAuthStateChange(async (event, session) => {
    if (session) {
        window.currentUserSession = session.user;
        window.globalUserRole = "User"; // Default fallback profile level
        
        try {
            const { data, error } = await dbInstance
                .from('users')
                .select('user_type')
                .eq('id', window.currentUserSession.id)
                .maybeSingle();
                
            if (data && data.user_type) {
                window.globalUserRole = data.user_type;
            }
        } catch (e) { 
            console.log("Profile role check bypassed, standard clearance applied."); 
        }

        // Hardcoded Master Override Shield
        if (window.currentUserSession.email === "sshujaat.ali@hotmail.com") {
            window.globalUserRole = "Admin";
        }
        bootDashboard(window.currentUserSession);
    } else {
        window.currentUserSession = null;
        teardownDashboard();
    }
});

function bootDashboard(user) {
    document.getElementById('login-layer').classList.add('hidden');
    document.getElementById('app-layer').classList.remove('hidden');
    document.getElementById('lbl-active-user').innerText = user.email;

    document.querySelectorAll('.admin-only').forEach(el => {
        if(window.globalUserRole === 'Admin') el.classList.remove('hidden');
        else el.classList.add('hidden');
    });

    seedAutomaticSystemDates();
    fetchAndListenToCloudData();
    showPage(window.globalUserRole === 'Admin' ? 'page1' : 'page3');
}

function teardownDashboard() {
    document.getElementById('app-layer').classList.add('hidden');
    document.getElementById('login-layer').classList.remove('hidden');
    document.getElementById('login-uid').value = '';
    document.getElementById('login-pwd').value = '';
    const loginBtn = document.getElementById('btn-login');
    if (loginBtn) {
        loginBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket me-1"></i> Sign In`;
        loginBtn.disabled = true; // Safe lock until cloud connection establishes
    }
    testSupabaseConnection();
    }