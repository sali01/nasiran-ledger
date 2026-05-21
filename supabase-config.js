/* ==========================================================================
   🔑 SECURITY ARCHITECTURE - SUPABASE REALTIME DATALINK SYSTEM CONNECTOR
   ========================================================================== */

const SUPABASE_URL = "https://nyhitutrfczvaolaaszx.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aGl0dXRyZmN6dmFvbGFhc3p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMzI5NjQsImV4cCI6MjA5NDkwODk2NH0.hU41TmqWCLGJoaTI0BDYLQxP72xvzn6x4buorfRT8zw";

let dbInstance = null;

try {
    dbInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
    } else {
        badge.className = "d-inline-block px-3 py-1 rounded-pill small fw-bold text-danger bg-danger-subtle";
        badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation me-1"></i> Connection Error`;
    }
}

// 🔐 TRANSACTION AUTHORIZATION CONTROLLERS
window.handleLogin = async function() {
    const email = document.getElementById('login-uid').value.trim();
    const password = document.getElementById('login-pwd').value;
    if(!email || !password) return alert("Please clarify all credential blocks.");
    
    const { data, error } = await dbInstance.auth.signInWithPassword({ email, password });
    if (error) alert("Access Failure: " + error.message);
};

window.handleLogout = async function() { 
    await dbInstance.auth.signOut(); 
};

// 🛰️ GLOBAL AUTHENTICATION LISTENER
dbInstance.auth.onAuthStateChange(async (event, session) => {
    if (session) {
        window.currentUserSession = session.user;
        window.globalUserRole = "User";
        
        try {
            const { data } = await dbInstance
                .from('users')
                .select('user_type')
                .eq('id', window.currentUserSession.id)
                .single();
                
            if (data) window.globalUserRole = data.user_type;
        } catch (e) { console.log("Role fetch processing..."); }

        if (window.currentUserSession.email === "sshujaat.ali@hotmail.com") window.globalUserRole = "Admin";
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
}