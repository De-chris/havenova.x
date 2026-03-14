const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzKPvu1ioGmdss-wXtKbMgvwgRdf8x85RBKTRJa0XB9bHbnnI8AJPIzd_h8GoBdHp4n/exec";

let currentUser = localStorage.getItem("hx_comm_user");
let currentRole = localStorage.getItem("hx_comm_role") || "User";
let roleCache = JSON.parse(localStorage.getItem("hx_roles_cache") || "{}");

if (!currentUser) {
  location.href = "login.html";
}

function withAuthParams(params) {
  const p = new URLSearchParams(params || {});
  if (currentUser) p.set("auth_uid", currentUser);
  return p.toString();
}

async function apiGet(params) {
  const r = await fetch(`${SCRIPT_URL}?${withAuthParams(params)}`);
  return r.json();
}

async function apiPost(payload) {
  const body = Object.assign({}, payload || {});
  if (currentUser && !body.auth_uid) body.auth_uid = currentUser;
  const r = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(body) });
  return r.json();
}

function clearSession() {
  localStorage.removeItem("hx_comm_user");
  localStorage.removeItem("hx_comm_role");
  localStorage.removeItem("hx_roles_cache");
  currentUser = null;
  currentRole = "User";
  roleCache = {};
}

async function verifyStoredUser() {
  if (!currentUser) return false;
  try {
    const res = await apiGet({ action: "get_users" });
    const users = Array.isArray(res.data) ? res.data : [];
    const exists = users.some(
      (u) => String(u.username || "").toLowerCase() === String(currentUser).toLowerCase()
    );
    if (!exists) {
      clearSession();
      return false;
    }
    return true;
  } catch (e) {
    return true;
  }
}

function getEliteName(username) {
  if (!username) return "";
  const role = (roleCache[username.toLowerCase()] || "User").trim();
  if (role === "Owner")
    return `<span class="name-verified">@${username} <i class="fas fa-check verified-badge"></i></span>`;
  if (role === "Admin")
    return `<span class="name-admin">@${username} <i class="fas fa-shield admin-badge"></i></span>`;
  return `<span>@${username}</span>`;
}

async function fetchStats(uid, elementId) {
  const res = await apiGet({ action: "get_social_stats", uid: uid });
  const stats = (res && res.data) || {};
  if (elementId)
    document.getElementById(elementId).innerHTML = `<div class="stat-card"><span class="stat-num">${stats.followers || 0}</span><span class="stat-label">Followers</span></div><div class="stat-card"><span class="stat-num">${stats.following || 0}</span><span class="stat-label">Following</span></div>`;
  return stats;
}

async function loadProfile() {
  if (!currentUser) return;
  fetchStats(currentUser, "my-stats");
  const res = await apiGet({ action: "get_user_data", uid: currentUser });
  const data = (res && res.data) || {};
  currentRole = (data.role || "User").trim();
  roleCache[currentUser.toLowerCase()] = currentRole;
  localStorage.setItem("hx_comm_role", currentRole);
  localStorage.setItem("hx_roles_cache", JSON.stringify(roleCache));

  document.getElementById("pfpBig").src = data.pic || `https://ui-avatars.com/api/?name=${currentUser}`;
  document.getElementById("nameDisplay").innerHTML = getEliteName(currentUser);
  document.getElementById("bioDisplay").innerText = data.bio || "No bio.";
  document.getElementById("updateBio").value = data.bio || "";
}

async function updateProfileData() {
  const bio = document.getElementById("updateBio").value.trim();
  const pic = document.getElementById("updatePfpUrl").value.trim();

  const payload = { action: "update_profile", uid: currentUser, bio };
  if (pic) payload.pic = pic;

  try {
    const res = await apiPost(payload);
    if (res && res.status === "Success") {
      // Refresh the page after saving to ensure UI reflects the latest data.
      location.reload();
    } else {
      console.error("Save failed:", res);
      alert(res?.data || "Unable to save profile. Please try again.");
    }
  } catch (e) {
    console.error("Failed to save profile:", e);
    alert("Unable to save profile. Please try again.");
  }
}

async function uploadToCatbox(fileInput, hiddenId, statusId) {
  const file = fileInput.files[0];
  if (!file) return;
  
  const statusEl = document.getElementById(statusId);
  statusEl.innerText = "Uploading...";
  
  const fd = new FormData();
  fd.append("reqtype", "fileupload");
  fd.append("fileToUpload", file);
  
  try {
    const response = await fetch('/api/upload', {
      method: "POST",
      body: fd,
      credentials: "omit"
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const url = (await response.text()).trim();
    
    // Validate that we got a valid URL back
    if (!url.startsWith("http")) {
      throw new Error("Invalid response from Catbox");
    }
    
    document.getElementById(hiddenId).value = url;
    statusEl.innerText = "✓ Uploaded";
    
    if (hiddenId === "updatePfpUrl") {
      document.getElementById("pfpBig").src = url;
    }
  } catch (e) {
    console.error("Upload error:", e);
    statusEl.innerText = "✗ Failed - Try again";
    setTimeout(() => { statusEl.innerText = ""; }, 3000);
  }
}

function logout() {
  clearSession();
  location.href = "login.html";
}

(async function boot() {
  const ok = await verifyStoredUser();
  if (!ok) {
    location.href = "login.html";
    return;
  }
  loadProfile();
})();
