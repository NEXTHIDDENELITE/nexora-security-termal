// ---------------------------------------------------
// 🔥 FIREBASE WEB CONFIGURATION (বটের ডাটাবেসের সাথে সিঙ্ক করা হলো)
// ---------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyDjT0cDLYnwxp00c6Upw_vK0o7Ie7kx3vs",
    authDomain: "nexorapanel-9c6d4.firebaseapp.com",
    databaseURL: "https://nexorapanel-9c6d4-default-rtdb.firebaseio.com", // 🔗 বটের ডাটাবেস লিংক
    projectId: "nexorapanel-9c6d4",
    storageBucket: "nexorapanel-9c6d4.firebasestorage.app",
    messagingSenderId: "153939576499",
    appId: "1:153939576499:web:4a5c65a0df17101c3552c6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// রানিং টাইমার অবজেক্ট ধরে রাখার মেমোরি
const activeIntervals = {};
// আগে কোন কোন ইউজার লগ হয়েছে তা ট্র্যাক করার জন্য (Duplicate Log রোধ করতে)
const loggedUsers = new Set();

// ---------------------------------------------------
// 📡 REAL-TIME DATA LOGIC (TIMEOUTS & KICKS)
// ---------------------------------------------------

// ১. কিক কাউন্টার লাইভ আপডেট করার জন্য লিসেনার
database.ref('stats/kickCount').on('value', (snapshot) => {
    const kickCountEl = document.getElementById('kick-count');
    if (kickCountEl) {
        kickCountEl.innerText = snapshot.val() || '0';
    }
});

// ২. একটিভ টাইমআউট লিস্ট ও কাউন্টার লিসেনার
database.ref('timeouts').on('value', (snapshot) => {
    const container = document.getElementById('timeout-container');
    const totalCountEl = document.getElementById('timeout-count');
    const terminal = document.getElementById('terminal-log');
    
    // আগের রানিং টাইমারগুলো পরিষ্কার করা
    for (let key in activeIntervals) {
        clearInterval(activeIntervals[key]);
    }
    
    container.innerHTML = '';
    const data = snapshot.val();

    if (!data) {
        container.innerHTML = '<p class="no-data">No users are currently restricted.</p>';
        totalCountEl.innerText = '0';
        return;
    }

    const userList = Object.values(data);
    totalCountEl.innerText = userList.length;

    userList.forEach(user => {
        const userRow = document.createElement('div');
        userRow.className = 'timeout-user-row';
        userRow.id = `user-${user.userId}`;

        // যদি ইউজারের অবতার না থাকে তবে ডিফল্ট ইমেজ বসবে
        const userAvatar = user.avatar ? user.avatar : "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png";

        userRow.innerHTML = `
            <img src="${userAvatar}" alt="Avatar" class="avatar">
            <div class="user-info">
                <div class="user-name">${user.username}</div>
                <div class="user-id">ID: ${user.userId}</div>
            </div>
            <div class="live-timer" id="timer-${user.userId}">00:00</div>
        `;
        container.appendChild(userRow);

        // 📟 টার্মিনালে লাইভ লগ পুশ (শুধুমাত্র নতুন ইউজার হলে একবারই লগ হবে)
        if (!loggedUsers.has(user.userId)) {
            const logLine = document.createElement('div');
            logLine.className = 'log-line text-danger';
            logLine.innerText = `[CRITICAL] User ${user.username} (${user.userId}) restricted. Reason: ${user.reason || "Automod Penalty"}`;
            terminal.appendChild(logLine);
            terminal.scrollTop = terminal.scrollHeight;
            loggedUsers.add(user.userId); // ট্র্যাকিং এ সেভ রাখা হলো
        }

        // ⏱️ লাইভ কাউন্টডাউন
        function startCountdown() {
            const timerEl = document.getElementById(`timer-${user.userId}`);
            if (!timerEl) return;

            const interval = setInterval(() => {
                const now = Date.now();
                const timeLeft = user.endTime - now;

                if (timeLeft <= 0) {
                    clearInterval(interval);
                    timerEl.innerText = "EXPIRED";
                    loggedUsers.delete(user.userId); // এক্সপায়ার হলে ট্র্যাক থেকে রিমুভ
                    return;
                }

                const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

                const displayHr = hours > 0 ? (hours < 10 ? '0' + hours : hours) + ':' : '';
                const displayMin = minutes < 10 ? '0' + minutes : minutes;
                const displaySec = seconds < 10 ? '0' + seconds : seconds;

                timerEl.innerText = `${displayHr}${displayMin}:${displaySec}`;
            }, 1000);

            activeIntervals[user.userId] = interval;
        }

        startCountdown();
    });
});

// ৩. লাইভ কিক ইভেন্ট টার্মিনালে দেখানোর জন্য এক্সট্রা লিসেনার (অপশনাল কিন্তু প্রফেশনাল)
database.ref('logs').limitToLast(1).on('child_added', (snapshot) => {
    const logData = snapshot.val();
    const terminal = document.getElementById('terminal-log');
    if (logData && logData.type === 'kick') {
        const logLine = document.createElement('div');
        logLine.className = 'log-line text-warning';
        logLine.innerText = `[KICK] ${logData.message || "A user has been kicked from the server."}`;
        terminal.appendChild(logLine);
        terminal.scrollTop = terminal.scrollHeight;
    }
});

// ---------------------------------------------------
// 🛡️ ANTI-LEAK SECURITY LAYER
// ---------------------------------------------------
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
    if (e.key === "F12" || (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) || (e.ctrlKey && e.key === "U")) {
        e.preventDefault();
    }
});
