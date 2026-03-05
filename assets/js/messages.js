const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzKPvu1ioGmdss-wXtKbMgvwgRdf8x85RBKTRJa0XB9bHbnnI8AJPIzd_h8GoBdHp4n/exec";

let currentUser = localStorage.getItem("hx_comm_user");
let roleCache = JSON.parse(localStorage.getItem("hx_roles_cache") || "{}");
let allUsersData = [];
let viewTarget = "";
let notifPollHandle = null;
let activeView = "list";
let chatPollHandle = null;
let isLoadingDMs = false;
let lastDmSignature = "";
let typingStopTimer = null;
let typingThrottleUntil = 0;
let localTypingState = false;

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
  const r = await fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return r.json();
}

function isLocalHost() {
  return (
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost"
  );
}

function updateChatUrl(target) {
  const encoded = encodeURIComponent(target);
  if (isLocalHost()) {
    history.replaceState({}, "", `messages.html?target=${encoded}`);
    return;
  }
  history.replaceState({}, "", `messages.html/@${encoded}`);
}

function clearStaleSession() {
  localStorage.removeItem("hx_comm_user");
  localStorage.removeItem("hx_comm_role");
  localStorage.removeItem("hx_roles_cache");
  currentUser = null;
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
      clearStaleSession();
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

function linkify(text) {
  if (!text) return "";
  return String(text).replace(/(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi, '<a href="$1" target="_blank" style="color:var(--primary);">$1</a>');
}

async function loadDMList() {
  const data = await apiGet({ action: "get_users" });
  allUsersData = Array.isArray(data.data) ? data.data : [];
  filterUsers();
}

function filterUsers() {
  const query = document.getElementById("userSearch").value.toLowerCase();
  const container = document.getElementById("dm-list-container");
  container.innerHTML = allUsersData
    .filter((u) => u.username !== currentUser && u.username.toLowerCase().includes(query))
    .map((u) => {
      if (u.role) roleCache[u.username.toLowerCase()] = u.role;
      return `<div class="hx-card" style="display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="startChat('${u.username.replace(/'/g, "\\'")}')">
      <img src="${u.pic || "https://ui-avatars.com/api/?name=" + u.username}" class="hx-pfp" style="width:35px; height:35px;">
      <b>${getEliteName(u.username)}</b>
    </div>`;
    })
    .join("");
  localStorage.setItem("hx_roles_cache", JSON.stringify(roleCache));
}

function startChat(target) {
  if (!target) return;
  if (viewTarget && viewTarget !== target) {
    pushTypingStatus(false, true);
    clearTypingTimers();
  }
  viewTarget = target;
  localTypingState = false;
  typingThrottleUntil = 0;
  lastDmSignature = "";
  setTypingIndicator(false);
  setMessagesView("chat");
  const chatWrap = document.getElementById("chat-wrap");
  chatWrap.classList.add("chat-full");
  document.getElementById("chat-target-name").innerHTML = getEliteName(target);
  updateChatUrl(target);
  loadDMs();
  loadTypingStatus();
  startChatPolling();
}

function closeChat() {
  pushTypingStatus(false, true);
  clearTypingTimers();
  setTypingIndicator(false);
  document.getElementById("chat-wrap").classList.remove("chat-full");
  viewTarget = "";
  setMessagesView("list");
  history.replaceState({}, "", "messages.html");
  stopChatPolling();
}

function dmSignature(dmList) {
  if (!Array.isArray(dmList) || dmList.length === 0) return "";
  const last = dmList[dmList.length - 1];
  if (Array.isArray(last)) return `${last[0]}|${last[2]}|${last[3] || ""}|${dmList.length}`;
  return `${last.from}|${last.text}|${last.timestamp || ""}|${dmList.length}`;
}

async function loadDMs() {
  if (!viewTarget || isLoadingDMs) return;
  isLoadingDMs = true;
  try {
    const res = await apiGet({
      action: "get_dms",
      uid: currentUser,
      target: viewTarget,
    });
    const dmList = Array.isArray(res.data) ? res.data : [];
    const signature = dmSignature(dmList);
    if (signature && signature === lastDmSignature) {
      return;
    }
    lastDmSignature = signature;
    const box = document.getElementById("chat-messages");
    box.innerHTML = dmList
      .map((m) => {
        const from = Array.isArray(m) ? m[0] : m.from;
        const text = Array.isArray(m) ? m[2] : m.text;
        return `<div class="msg-row ${from === currentUser ? "me" : "them"}"><div class="msg-bubble">${linkify(
          text
        )}</div></div>`;
      })
      .join("");
    box.scrollTop = box.scrollHeight;
  } catch (e) {
    // Polling should continue even on transient failures.
  } finally {
    isLoadingDMs = false;
  }
}

async function sendDM() {
  const input = document.getElementById("msgInput");
  if (!input.value || !viewTarget) return;
  const text = input.value;
  const box = document.getElementById("chat-messages");
  box.innerHTML += `<div class="msg-row me"><div class="msg-bubble">${linkify(text)}</div></div>`;
  box.scrollTop = box.scrollHeight;
  await apiPost({
    action: "dm",
    uid: currentUser,
    target: viewTarget,
    message: text,
  });
  input.value = "";
  pushTypingStatus(false, true);
  loadDMs();
  loadNotifications();
}

function setTypingIndicator(visible) {
  const el = document.getElementById("typing-indicator");
  if (!el) return;
  el.style.display = visible ? "block" : "none";
}

function clearTypingTimers() {
  if (typingStopTimer) {
    clearTimeout(typingStopTimer);
    typingStopTimer = null;
  }
}

async function pushTypingStatus(isTyping, force) {
  if (!viewTarget || !currentUser) return;
  if (!force && localTypingState === isTyping) return;

  localTypingState = isTyping;
  try {
    await apiPost({
      action: "set_typing",
      uid: currentUser,
      target: viewTarget,
      typing: !!isTyping,
    });
  } catch (e) {}
}

function onMessageInput() {
  const input = document.getElementById("msgInput");
  if (!input || !viewTarget) return;
  const hasText = input.value.trim().length > 0;
  clearTypingTimers();

  if (!hasText) {
    pushTypingStatus(false, true);
    return;
  }

  const now = Date.now();
  if (now >= typingThrottleUntil) {
    typingThrottleUntil = now + 1200;
    pushTypingStatus(true, false);
  }

  typingStopTimer = setTimeout(() => {
    pushTypingStatus(false, true);
  }, 1400);
}

async function loadTypingStatus() {
  if (!viewTarget || activeView !== "chat") return;
  try {
    const res = await apiGet({
      action: "get_typing",
      uid: currentUser,
      target: viewTarget,
    });
    const typing = !!(res && res.ok && res.data && res.data.typing);
    setTypingIndicator(typing);
  } catch (e) {
    setTypingIndicator(false);
  }
}

function getNotifIcon(type) {
  if (type === "comment") return "fa-comment";
  if (type === "like") return "fa-heart";
  if (type === "follow") return "fa-user-plus";
  if (type === "dm") return "fa-paper-plane";
  return "fa-bell";
}

function formatTimeAgo(ts) {
  const t = Number(ts || 0);
  if (!t) return "";
  const diff = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function toggleNotifications() {
  if (activeView === "notif") {
    setMessagesView(viewTarget ? "chat" : "list");
    return;
  }
  setMessagesView("notif");
  loadNotifications(true);
}

async function loadNotifications(forceRender) {
  if (!currentUser) return;
  try {
    const res = await apiGet({
      action: "get_notifications",
      uid: currentUser,
      limit: 30,
    });
    const list = Array.isArray(res.data) ? res.data : [];
    const unread = list.filter((n) => !n.read).length;
    const dot = document.getElementById("notif-dot");
    if (dot) dot.style.display = unread > 0 ? "block" : "none";

    if (!forceRender && activeView !== "notif") return;

    const container = document.getElementById("notif-list-container");
    if (list.length === 0) {
      container.innerHTML = "<p style='text-align:center; padding:20px; color:var(--muted)'>No notifications yet.</p>";
      return;
    }

    container.innerHTML = list
      .map(
        (n) => `<div class="notif-item ${n.read ? "" : "unread"}">
      <div class="notif-icon"><i class="fas ${getNotifIcon(n.type)}"></i></div>
      <div class="notif-body">
        <p class="notif-text">${linkify(n.text || "")}</p>
        <div class="notif-time">${formatTimeAgo(n.timestamp)}</div>
      </div>
    </div>`
      )
      .join("");
  } catch (e) {}
}

function setMessagesView(view) {
  activeView = view;
  const list = document.getElementById("list-wrap");
  const chat = document.getElementById("chat-wrap");
  const notif = document.getElementById("notif-panel");

  list.style.display = view === "list" ? "block" : "none";
  chat.style.display = view === "chat" ? "block" : "none";
  notif.style.display = view === "notif" ? "block" : "none";
}

function startChatPolling() {
  stopChatPolling();
  chatPollHandle = setInterval(() => {
    if (!document.hidden && activeView === "chat" && viewTarget) {
      loadDMs();
      loadTypingStatus();
    }
  }, 2000);
}

function stopChatPolling() {
  if (chatPollHandle) {
    clearInterval(chatPollHandle);
    chatPollHandle = null;
  }
}

async function markNotificationsRead() {
  await apiPost({ action: "mark_notifications_read", uid: currentUser });
  loadNotifications(true);
}

(async function init() {
  const ok = await verifyStoredUser();
  if (!ok) {
    location.href = "login.html";
    return;
  }
  setMessagesView("list");
  loadDMList();
  loadNotifications(false);

  const pathMatch = window.location.pathname.match(/messages\.html\/@([^/?#]+)/i);
  const fromPath = pathMatch ? decodeURIComponent(pathMatch[1]) : "";
  const fromQuery = new URLSearchParams(window.location.search).get("target");
  const fromHash = window.location.hash.startsWith("#@")
    ? decodeURIComponent(window.location.hash.slice(2))
    : "";
  const target = fromPath || fromQuery || fromHash;
  if (target) startChat(target);
  const input = document.getElementById("msgInput");
  if (input) {
    input.addEventListener("input", onMessageInput);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendDM();
      }
    });
  }

  notifPollHandle = setInterval(() => {
    if (!document.hidden) loadNotifications(false);
  }, 45000);
})();

window.addEventListener("beforeunload", () => {
  pushTypingStatus(false, true);
  clearTypingTimers();
  stopChatPolling();
});
