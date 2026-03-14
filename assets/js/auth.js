const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzKPvu1ioGmdss-wXtKbMgvwgRdf8x85RBKTRJa0XB9bHbnnI8AJPIzd_h8GoBdHp4n/exec";

const AUTH_MODE = window.AUTH_MODE || "login";
let currentUser = localStorage.getItem("hx_comm_user");

function setSession(username, role) {
  const user = String(username || "").trim();
  if (!user) return;
  localStorage.setItem("hx_comm_user", user);
  localStorage.setItem("hx_comm_role", String(role || "User").trim());
  currentUser = user;
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

async function verifyStoredUser() {
  if (!currentUser) return false;
  try {
    const res = await apiGet({ action: "get_users" });
    if (res && res.status === "Unauthorized") return false;
    const users = Array.isArray(res.data) ? res.data : [];
    return users.some(
      (u) => String(u.username || "").toLowerCase() === String(currentUser).toLowerCase()
    );
  } catch (e) {
    return false;
  }
}

async function uploadToCatbox(fileInput, hiddenId, statusId) {
  const file = fileInput.files[0];
  if (!file) return;
  const status = document.getElementById(statusId);
  const hidden = document.getElementById(hiddenId);
  if (!status || !hidden) return;
  status.innerText = "Syncing...";
  const fd = new FormData();
  fd.append("reqtype", "fileupload");
  fd.append("fileToUpload", file);
  try {
    const r = await fetch(
      '/api/upload',
      { method: "POST", body: fd }
    );
    hidden.value = (await r.text()).trim();
    status.innerText = "Linked! OK";
  } catch (e) {
    status.innerText = "Failed";
  }
}

async function loginUser() {
  const username = document.getElementById("logUser").value.trim();
  const password = document.getElementById("logPass").value.trim();
  if (!username || !password) {
    alert("Username and password are required.");
    return;
  }
  try {
    const r = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "login", username, password }),
    });
    const res = await r.json();
    if (res.status !== "Success") {
      alert(res.data || "Login failed.");
      return;
    }
    setSession(res.data.username, res.data.role);
    location.href = "profile.html";
  } catch (e) {
    alert("Login failed.");
  }
}

async function signupUser() {
  const username = document.getElementById("sigUser").value.trim();
  const email = document.getElementById("sigEmail").value.trim();
  const password = document.getElementById("sigPass").value.trim();
  const pic = document.getElementById("sigPfp").value.trim();
  if (!username || !password) {
    alert("Username and password are required.");
    return;
  }
  try {
    const r = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "signup", username, email, password, pic }),
    });
    const res = await r.json();
    if (res.status !== "Success") {
      alert(res.data || "Signup failed.");
      return;
    }
    setSession(res.data.username, res.data.role);
    location.href = "profile.html";
  } catch (e) {
    alert("Signup failed.");
  }
}

(async function boot() {
  const ok = await verifyStoredUser();
  if (ok) {
    location.href = "profile.html";
    return;
  }

  const loginBox = document.getElementById("login-view");
  const signupBox = document.getElementById("signup-view");
  if (loginBox) loginBox.style.display = AUTH_MODE === "login" ? "block" : "none";
  if (signupBox) signupBox.style.display = AUTH_MODE === "signup" ? "block" : "none";
})();
