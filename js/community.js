const COMMUNITY_SCRIPT = "https://script.google.com/macros/s/AKfycby9eEtH55XibqVgBOPeANg7WKYL61MOQYeBuKJWOD5UTRGn4VeSMcGNeFsUkk3WyfRpeA/exec";

let currentUser = localStorage.getItem("hx_comm_user");
let likedPosts = JSON.parse(localStorage.getItem("hx_comm_liked") || "[]");
let viewTarget = "";
let cachedFeed = JSON.parse(localStorage.getItem("hx_feed_cache") || "[]");
let fabTimer;
let activeReportId = null;

function linkify(text) {
    return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')
               .replace(/@(\w+)/g, '<span class="hx-username-link" onclick="viewProfile(\'$1\')">@$1</span>');
}

function openScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const screen = document.getElementById(id + '-screen');
    if (screen) screen.classList.add('active');
    const nav = document.getElementById('nav-' + id);
    if (nav) nav.classList.add('active');
    
    wakeFab();
    if(id === 'home') loadFeed();
    if(id === 'dm') loadDMList();
    if(id === 'profile') checkUserStatus();
}

function checkUserStatus() {
    if (currentUser) {
        // Show profile
        document.getElementById('login-view').style.display = 'none';
        document.getElementById('signup-view').style.display = 'none';
        document.getElementById('profile-box').style.display = 'block';
        
        // Load user data
        fetch(`${COMMUNITY_SCRIPT}?action=get_user_data&uid=${currentUser}`)
            .then(r => r.json())
            .then(res => {
                document.getElementById('pfpBig').src = res.data.pic || `https://ui-avatars.com/api/?name=${currentUser}`;
                document.getElementById('nameDisplay').innerText = '@' + currentUser;
                document.getElementById('bioDisplay').innerText = res.data.bio || '';
                document.getElementById('updateBio').value = res.data.bio || '';
            });
        
        fetchStats(currentUser, 'my-stats');
        renderUserPosts(currentUser, 'my-posts-container');
    } else {
        // Show login
        document.getElementById('login-view').style.display = 'block';
        document.getElementById('signup-view').style.display = 'none';
        document.getElementById('profile-box').style.display = 'none';
    }
}

async function userAuth(type) {
    const isLogin = type === 'login';
    const userField = isLogin ? 'logUser' : 'sigUser';
    const passField = isLogin ? 'logPass' : 'sigPass';
    const emailField = isLogin ? null : 'sigEmail';
    const bioField = isLogin ? null : 'sigBio';
    const pfpField = isLogin ? null : 'sigPfpFile';
    const confirmField = isLogin ? null : 'sigPassConfirm';
    
    const username = document.getElementById(userField).value.trim();
    const password = document.getElementById(passField).value;
    const email = emailField ? document.getElementById(emailField).value.trim() : '';
    const bio = bioField ? document.getElementById(bioField).value.trim() : '';
    const pfpFile = pfpField ? document.getElementById(pfpField).files[0] : null;
    const confirmPass = confirmField ? document.getElementById(confirmField).value : '';
    
    if (!username || !password) return alert('Please fill in all required fields');
    if (!isLogin && password !== confirmPass) return alert('Passwords do not match');
    
    const btnId = isLogin ? 'loginBtn' : 'signupBtn';
    disableActions(btnId, 'Processing...');
    
    let pfpUrl = '';
    if (pfpFile) {
        try {
            pfpUrl = await uploadToCatbox(pfpFile);
        } catch (error) {
            alert("Failed to upload profile picture. Please try again.");
            enableActions(btnId);
            return;
        }
    }
    
    try {
        const response = await fetch(COMMUNITY_SCRIPT, {
            method: 'POST',
            body: JSON.stringify({
                action: type,
                username: username,
                password: password,
                email: email,
                bio: bio,
                pic: pfpUrl
            })
        });
        const result = await response.json();
        
        if (result.success) {
            localStorage.setItem('hx_comm_user', username);
            currentUser = username;
            checkUserStatus();
            loadFeed();
        } else {
            alert(result.message || 'Authentication failed');
        }
    } catch (error) {
        alert('Network error. Please try again.');
    }
    
    enableActions(btnId);
}

async function updateProfileData() {
    const bio = document.getElementById('updateBio').value.trim();
    const pfpFile = document.getElementById('updatePfpFile').files[0];
    
    disableActions('saveProfileBtn', 'Saving...');
    
    let pfpUrl = '';
    if (pfpFile) {
        try {
            pfpUrl = await uploadToCatbox(pfpFile);
        } catch (error) {
            alert("Failed to upload profile picture. Please try again.");
            enableActions('saveProfileBtn');
            return;
        }
    }
    
    try {
        await fetch(COMMUNITY_SCRIPT, {
            method: 'POST',
            body: JSON.stringify({
                action: 'update_profile',
                uid: currentUser,
                bio: bio,
                pic: pfpUrl
            })
        });
        
        document.getElementById('bioDisplay').innerText = bio;
        if (pfpUrl) {
            document.getElementById('pfpBig').src = pfpUrl;
        }
        alert('Profile updated successfully!');
    } catch (error) {
        alert('Failed to update profile');
    }
    
    enableActions('saveProfileBtn');
}

function togglePass(fieldId) {
    const field = document.getElementById(fieldId);
    const icon = field.parentElement.querySelector('.pass-toggle');
    if (field.type === 'password') {
        field.type = 'text';
        icon.className = 'fas fa-eye-slash pass-toggle';
    } else {
        field.type = 'password';
        icon.className = 'fas fa-eye pass-toggle';
    }
}

function disableActions(btnId, text = 'Loading...') {
    const btn = document.getElementById(btnId);
    btn.disabled = true;
    btn.innerHTML = text;
}

function enableActions(btnId, text = null) {
    const btn = document.getElementById(btnId);
    btn.disabled = false;
    if(text) btn.innerHTML = text;
}

async function loadFeed(force = false) {
    if(!force && cachedFeed.length) return renderFeed();
    document.getElementById("bg-loader").style.display = "block";
    const r = await fetch(`${COMMUNITY_SCRIPT}?action=get_feed`);
    const res = await r.json();
    cachedFeed = res.data;
    localStorage.setItem("hx_feed_cache", JSON.stringify(cachedFeed));
    renderFeed();
    document.getElementById("bg-loader").style.display = "none";
}

function renderFeed() {
    const container = document.getElementById("feed-container");
    container.innerHTML = cachedFeed.map(p => createPostCard(p)).join("");
}

function createPostCard(p) {
    const isLiked = likedPosts.includes(p.id);
    const card = document.createElement("div");
    card.className = "hx-card";
    card.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
            <img src="${p.author_pic || 'https://ui-avatars.com/api/?name='+p.author}" class="hx-pfp" onclick="viewProfile('${p.author}')">
            <div style="flex:1;">
                <b class="hx-username-link" onclick="viewProfile('${p.author}')">@${p.author}</b>
                <div style="color:var(--muted); font-size:12px;">${new Date(p.timestamp).toLocaleString()}</div>
            </div>
            ${currentUser === p.author ? `<i class="fas fa-ellipsis-h" style="cursor:pointer;" onclick="showPostMenu('${p.id}')"></i>` : ''}
        </div>
        <div style="margin-bottom:12px;">${linkify(p.content)}</div>
        ${p.media ? `<img src="${p.media}" class="post-media" onclick="openMedia('${p.media}')">` : ''}
        <div style="display:flex; align-items:center; gap:15px; margin-top:12px;">
            <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="doLike('${p.id}', this)">
                <i class="fa${isLiked ? 's' : 'r'} fa-heart"></i> <span class="lc">${p.likes}</span>
            </button>
            <button class="action-btn" onclick="loadComments('${p.id}')">
                <i class="far fa-comment"></i> ${p.comments}
            </button>
            <button class="action-btn" onclick="sharePost('${p.id}')">
                <i class="fas fa-share"></i>
            </button>
        </div>`;
    return card;
}

function showPostMenu(pid) {
    if(!confirm("Delete this post?")) return;
    fetch(COMMUNITY_SCRIPT, {method:"POST", body:JSON.stringify({action:"delete_post", pid:pid, uid:currentUser})});
    loadFeed(true);
}

function openMedia(url) { window.open(url, '_blank'); }

function sharePost(pid) {
    const url = `${window.location.origin}${window.location.pathname}?post=${pid}`;
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard!");
}

async function loadComments(pid) {
    const r = await fetch(`${COMMUNITY_SCRIPT}?action=get_comments&pid=${pid}`);
    const res = await r.json();
    const container = document.getElementById("full-comment-list");
    container.innerHTML = res.data.map(c => `
        <div class="hx-card" style="margin-bottom:10px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <img src="${c.author_pic || 'https://ui-avatars.com/api/?name='+c.author}" class="hx-pfp" style="width:25px; height:25px;" onclick="viewProfile('${c.author}')">
                <b class="hx-username-link" onclick="viewProfile('${c.author}')">@${c.author}</b>
                <div style="color:var(--muted); font-size:10px;">${new Date(c.timestamp).toLocaleString()}</div>
            </div>
            <div>${linkify(c.content)}</div>
        </div>`).join("");
    document.getElementById("active-comment-input").value = "";
    document.getElementById("active-comment-btn").onclick = () => sendComment(pid);
    openScreen('comment-view');
}

async function sendComment(pid) {
    const input = document.getElementById("active-comment-input");
    if(!input.value.trim() || !currentUser) return;
    disableActions('active-comment-btn', '...');
    await fetch(COMMUNITY_SCRIPT, {method:"POST", body:JSON.stringify({action:"comment", pid:pid, uid:currentUser, content:input.value})});
    input.value = "";
    loadFeed(true);
    openScreen('home');
    enableActions('active-comment-btn');
}

async function doLike(pid, btn) {
    if(!currentUser || btn.classList.contains('liked')) return;
    btn.classList.add('liked');
    btn.querySelector('i').className = "fas fa-heart";
    const c = btn.querySelector('.lc');
    c.innerText = parseInt(c.innerText) + 1;
    likedPosts.push(pid);
    localStorage.setItem("hx_comm_liked", JSON.stringify(likedPosts));
    await fetch(COMMUNITY_SCRIPT, {method:"POST", body:JSON.stringify({action:"like", pid:pid, uid:currentUser})});
}

async function loadDMList() {
    const container = document.getElementById("dm-list-container");
    container.innerHTML = "<p style='text-align:center; padding:20px;'><i class='fas fa-spinner fa-spin'></i> Syncing Social...</p>";
    
    const uRes = await fetch(`${COMMUNITY_SCRIPT}?action=get_users`);
    const users = await uRes.json();
    container.innerHTML = users.data.filter(u => u.username !== currentUser).map(u => `
        <div class="hx-card" style="display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="startChat('${u.username}')">
            <img src="${u.pic || 'https://ui-avatars.com/api/?name='+u.username}" class="hx-pfp" style="width:35px; height:35px;">
            <div style="flex:1;"><b>@${u.username}</b></div>
            <i class="fas fa-chevron-right" style="font-size:12px; color:var(--muted)"></i>
        </div>`).join("");
}

async function startChat(t) {
    viewTarget = t; openScreen('chat-view');
    document.getElementById("chat-target-name").innerText = "@" + t;
    loadDMs();
}

async function loadDMs() {
    const r = await fetch(`${COMMUNITY_SCRIPT}?action=get_dms&uid=${currentUser}&target=${viewTarget}`);
    const res = await r.json();
    const box = document.getElementById("chat-messages");
    box.innerHTML = res.data.map(m => `
        <div class="chat-row" style="text-align:${m[0] == currentUser ? 'right' : 'left'}">
            <div class="chat-bubble" 
                 style="background:${m[0] == currentUser ? 'var(--primary)' : 'var(--card)'}; color:${m[0] == currentUser ? '#000' : '#fff'};"
                 onclick="${m[0] == currentUser ? `confirmDeleteDM('${m[2]}')` : ''}">
                ${linkify(m[2])}
            </div>
        </div>`).join("");
    box.scrollTop = box.scrollHeight;
}

async function confirmDeleteDM(msg) {
    if(!confirm("Delete this message?")) return;
    await fetch(COMMUNITY_SCRIPT, {
        method: "POST",
        body: JSON.stringify({ action: 'delete_dm', uid: currentUser, target: viewTarget, message: msg })
    });
    loadDMs();
}

async function sendDM() {
    const i = document.getElementById("msgInput");
    if(!i.value.trim()) return;
    disableActions('sendDmBtn', '...');
    await fetch(COMMUNITY_SCRIPT, {method:"POST", body:JSON.stringify({action:"dm", uid:currentUser, target:viewTarget, message:i.value})});
    i.value = ""; loadDMs(); enableActions('sendDmBtn');
}

async function viewProfile(username) {
    if(username === currentUser) return openScreen('profile');
    viewTarget = username; openScreen('user-profile');
    document.getElementById("view-name").innerText = "@" + username;
    
    fetch(`${COMMUNITY_SCRIPT}?action=get_user_data&uid=${username}`)
        .then(r => r.json())
        .then(res => {
            document.getElementById("view-pfp").src = res.data.pic || `https://ui-avatars.com/api/?name=${username}`;
            document.getElementById("view-bio").innerHTML = linkify(res.data.bio || "");
        });

    fetchStats(username, "stat-followers");
    renderUserPosts(username, "user-posts-container");
}

async function toggleFollow() {
    disableActions('followBtn', '...');
    const res = await fetch(COMMUNITY_SCRIPT, {method:"POST", body:JSON.stringify({action: "follow", uid: currentUser, target: viewTarget})});
    const data = await res.json();
    document.getElementById("followBtn").innerText = (data.data === "Followed") ? "Unfollow" : "Follow";
    fetchStats(viewTarget, "stat-followers");
    enableActions('followBtn');
}

async function fetchStats(uid, elementId) {
    const r = await fetch(`${COMMUNITY_SCRIPT}?action=get_social_stats&uid=${uid}`);
    const res = await r.json();
    if(elementId === "my-stats") {
        document.getElementById(elementId).innerHTML = `
            <div class="stat-card"><span class="stat-num">${res.data.followers}</span>Followers</div>
            <div class="stat-card"><span class="stat-num">${res.data.following}</span>Following</div>`;
    } else {
        document.getElementById("stat-followers").innerText = res.data.followers;
        document.getElementById("stat-following").innerText = res.data.following;
    }
}

function renderUserPosts(u, divId) {
    const posts = cachedFeed.filter(p => p.author === u);
    const container = document.getElementById(divId);
    container.innerHTML = posts.length ? "" : "<p style='color:var(--muted); padding:20px; text-align:center;'>No posts yet.</p>";
    posts.forEach(p => container.appendChild(createPostCard(p)));
}

async function submitBroadcast() {
    const t = document.getElementById("postText").value;
    const fileInput = document.getElementById("imageFileInput");
    const file = fileInput.files[0];
    
    if(!t && !file) return;
    
    disableActions('postBtn', 'Posting...');
    document.getElementById("bg-loader").style.display = "block";
    
    let mediaUrl = "";
    if (file) {
        try {
            mediaUrl = await uploadToCatbox(file);
        } catch (error) {
            alert("Failed to upload image. Please try again.");
            enableActions('postBtn');
            document.getElementById("bg-loader").style.display = "none";
            return;
        }
    }
    
    await fetch(COMMUNITY_SCRIPT, {method:"POST", body:JSON.stringify({action:"post", uid:currentUser, content:t, media:mediaUrl})});
    document.getElementById("postText").value = "";
    document.getElementById("imageFileInput").value = "";
    loadFeed(true);
    openScreen('home');
    enableActions('postBtn');
    document.getElementById("bg-loader").style.display = "none";
}

async function uploadToCatbox(file) {
    const formData = new FormData();
    formData.append('fileToUpload', file);
    formData.append('reqtype', 'fileupload');
    
    const response = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        throw new Error('Upload failed');
    }
    
    const url = await response.text();
    return url.trim();
}

function logout() { localStorage.removeItem("hx_comm_user"); location.reload(); }

function wakeFab() {
    const fab = document.getElementById('mainFab');
    const isHome = document.getElementById('home-screen').classList.contains('active');
    if(!isHome) { fab.classList.remove('visible'); return; }
    fab.classList.add('visible');
    fab.classList.remove('dormant');
    clearTimeout(fabTimer);
    fabTimer = setTimeout(() => fab.classList.add('dormant'), 4500);
}

function handleFab() { currentUser ? openScreen('compose') : openScreen('profile'); }

function toggleAuthView(view) {
    document.getElementById('login-view').style.display = view === 'login' ? 'block' : 'none';
    document.getElementById('signup-view').style.display = view === 'signup' ? 'block' : 'none';
}

document.addEventListener('touchstart', wakeFab);
if(currentUser) loadFeed(); else openScreen('profile');