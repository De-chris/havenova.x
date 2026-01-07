const api_url = "https://script.google.com/macros/s/AKfycbzpxWVXd9pUQe5cJCTJyxtNB6TVto1TEDPmwRYq3bo0eKjfKfPWm558HeMh3EaOCMfl/exec";
const activity_url = "https://script.google.com/macros/s/AKfycbx7xeCXgINXt0bgVx5TMT-shfI3dKny7H-hn9po7iVD3kOzUsldOVCjFU8hLfGViFFAow/exec";
const myTG = "dechrisathx";

let allItems = [];
let currentItem = null;
let currentUser = localStorage.getItem("hx_user") || null;
let loadedComments = [];
let commentIndex = 0;

window.onload = () => {
    updateUserBtn();
    // Cache loading for swift speed
    const cached = localStorage.getItem("hx_cache");
    if(cached){ 
        allItems = JSON.parse(cached); 
        render(allItems); 
        document.getElementById("loading").style.display="none"; 
        checkDeepLink(); 
    }
    fetchData();
};

async function fetchData(){
    try {
        const r = await fetch(api_url);
        const data = await r.json();
        // Generate Unique Private IDs for each template
        allItems = data.map((item, idx) => ({
            ...item,
            private_id: `hx_${Math.random().toString(36).substr(2, 5)}_${idx}`,
            slug: item.name.replace(/\s+/g,'_').toLowerCase()
        }));
        localStorage.setItem("hx_cache", JSON.stringify(allItems));
        render(allItems);
        document.getElementById("loading").style.display="none";
        checkDeepLink();
    } catch(e) { document.getElementById("sync-status").style.display="block"; }
}

function checkDeepLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if(id) openProduct(id);
}

function render(data){
    const container = document.getElementById("template-container");
    container.innerHTML = "";
    data.forEach(item => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <img src="${item.imageurl || item['Image URL']}" onclick="openProduct('${item.private_id}')">
            <div class="badge-row">
                <span class="type-badge ${item.type.toLowerCase()==='free'?'type-free':'type-paid'}">${item.type}</span>
                <span class="cat-badge" style="font-size:10px; color:var(--muted)">ID: ${item.private_id}</span>
            </div>
            <h3 style="margin:8px 0 4px; font-size:15px;">${item.name}</h3>
            <div class="btn-row">
                <button class="main-btn" onclick="openProduct('${item.private_id}')">View</button>
                <button class="icon-btn" onclick="addLike('${item.private_id}', '${item.name}', this)">
                    <i class="fas fa-heart" style="color:#ff4b2b"></i> <span id="cnt-${item.private_id}">0</span>
                </button>
            </div>`;
        container.appendChild(card);
        syncActivity(item.private_id);
    });
}

function openProduct(pid){
    const item = allItems.find(i => i.private_id === pid);
    if(!item) return;
    currentItem = item;
    
    // Update URL without refreshing (Website Logic)
    window.history.pushState({}, '', `?id=${pid}`);
    
    document.getElementById("productOverlay").style.display = "flex";
    document.getElementById("ovImg").src = item.imageurl || item['Image URL'];
    document.getElementById("ovTitle").innerText = item.name;
    document.getElementById("ovDesc").innerText = item.description;
    document.getElementById("ovPrice").innerText = item.price;
    
    // Report & Copy Link Logic
    const privateLink = `${window.location.origin}${window.location.pathname}?id=${pid}`;
    document.getElementById("copyLinkBtn").onclick = () => {
        navigator.clipboard.writeText(privateLink);
        document.getElementById("copyLinkBtn").innerHTML = '<i class="fas fa-check" style="color:var(--free-color)"></i>';
        setTimeout(()=> document.getElementById("copyLinkBtn").innerHTML = '<i class="fas fa-link"></i>', 2000);
    };
    
    document.getElementById("reportBtn").onclick = () => {
        window.open(`https://t.me/${myTG}?text=REPORT%20TEMPLATE%0AID:%20${pid}%0ALink:%20${privateLink}`, "_blank");
    };

    const btn = document.getElementById("ovActionBtn");
    if(item.type.toLowerCase() === "free") {
        btn.innerHTML = `<i class="fas fa-download"></i> Download Free`;
        btn.style.background = "var(--free-color)";
        btn.onclick = () => window.open(item.downloadurl, "_blank");
    } else {
        // Updated Buy Button with Black Cart Icon
        btn.innerHTML = `Buy From Telegram <i class="fas fa-shopping-cart" style="color:black; margin-left:8px;"></i>`;
        btn.style.background = "var(--primary)";
        btn.onclick = () => window.open(`https://t.me/${myTG}?text=Order:%20${item.name}%20(ID:${pid})`, "_blank");
    }
    syncActivity(pid);
}

async function syncActivity(id) {
    try {
        const r = await fetch(`${activity_url}?action=getActivity&productId=${id}`);
        const data = await r.json();
        const span = document.getElementById(`cnt-${id}`);
        if(span) span.innerText = data.likes;
        if(currentItem && currentItem.private_id === id) {
            document.getElementById("ovLikeCnt").innerText = data.likes;
            loadedComments = data.comments.reverse();
            commentIndex = 0;
            renderComments();
        }
    } catch(e) {}
}

function renderComments(append = false) {
    const list = document.getElementById("commentList");
    const btn = document.getElementById("showMoreComments");
    if(!append) list.innerHTML = "";
    const slice = loadedComments.slice(commentIndex, commentIndex + 6);
    slice.forEach(c => {
        list.innerHTML += `<div style="margin-bottom:8px; border-bottom:1px solid var(--border); padding-bottom:5px;">
            <span style="font-weight:bold; font-size:12px; color:var(--primary);">@${c.user}</span>
            <p style="margin:2px 0; font-size:13px;">${c.text}</p>
        </div>`;
    });
    commentIndex += 6;
    btn.style.display = (commentIndex < loadedComments.length) ? "block" : "none";
}

async function postComment() {
    if(!currentUser) return toggleAccount();
    const msg = document.getElementById("commentMsg").value;
    if(!msg) return;
    await fetch(`${activity_url}?action=addComment`, { method: "POST", body: JSON.stringify({ productId: currentItem.private_id, username: currentUser, comment: msg }) });
    document.getElementById("commentMsg").value = "";
    syncActivity(currentItem.private_id);
}

async function addLike(id, name, btn) {
    if(!currentUser) return toggleAccount();
    btn.style.transform = "scale(1.3)";
    await fetch(`${activity_url}?action=addLike`, { method: "POST", body: JSON.stringify({ productId: id, productName: name }) });
    syncActivity(id);
    setTimeout(()=> btn.style.transform = "scale(1)", 200);
}

function closeOverlay() { 
    document.getElementById("productOverlay").style.display = "none"; 
    currentItem = null; 
    window.history.pushState({}, '', window.location.pathname);
}

function toggleTheme(){
    const isLight = document.body.classList.toggle("light");
    document.getElementById("tIcon").className = isLight ? "fas fa-sun" : "fas fa-moon";
    localStorage.setItem("hx_theme", isLight ? "light" : "dark");
}
if(localStorage.getItem("hx_theme") === "light") toggleTheme();

function refreshData() { localStorage.removeItem("hx_cache"); location.reload(); }
function toggleAccount() { if(currentUser){ localStorage.removeItem("hx_user"); currentUser=null; location.reload(); } else { document.getElementById("authModal").style.display="flex"; } }
function closeAuth() { document.getElementById("authModal").style.display="none"; }
function authLogin() { 
    const u = document.getElementById("logUser").value; 
    if(u){ currentUser=u; localStorage.setItem("hx_user", u); closeAuth(); updateUserBtn(); } 
}
function updateUserBtn() { document.getElementById("userBtn").innerHTML = currentUser ? `<i class="fas fa-sign-out-alt"></i>` : `<i class="fas fa-user"></i>`; }

document.getElementById("searchInput").oninput = (e) => {
    const q = e.target.value.toLowerCase();
    render(allItems.filter(i => i.name.toLowerCase().includes(q) || i.private_id.toLowerCase().includes(q)));
};

function sendSupport(){
    const msg = document.getElementById("supportMsg").value;
    window.open(`https://t.me/${myTG}?text=[SUPPORT]%20${encodeURIComponent(msg)}`, "_blank");
}