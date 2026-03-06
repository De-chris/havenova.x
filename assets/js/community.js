const SCRIPT_URL =
        "https://script.google.com/macros/s/AKfycbzKPvu1ioGmdss-wXtKbMgvwgRdf8x85RBKTRJa0XB9bHbnnI8AJPIzd_h8GoBdHp4n/exec";
      let currentUser = localStorage.getItem("hx_comm_user");
      let currentRole = localStorage.getItem("hx_comm_role") || "User";
      let likedPosts = JSON.parse(
        localStorage.getItem("hx_comm_liked") || "[]"
      );
      let viewTarget = "";
      let currentActivePost = "";
      let roleCache = JSON.parse(
        localStorage.getItem("hx_roles_cache") || "{}"
      );
      let allUsersData = [];
      let isFeedLoading = false;
      let lastFeedLoad = 0;
      let notifPollHandle = null;
      let mediaCarouselState = {};
      let mediaViewerState = { images: [], index: 0, caption: "", author: "" };
      let viewerTouchStartX = 0;
      let cropper = null;

      if (!currentUser) {
        location.href = "login";
      }

      function ensureAuthOrRedirect() {
        if (!currentUser) {
          location.href = "login";
          return false;
        }
        return true;
      }

      function withAuthParams(params) {
        const p = new URLSearchParams(params || {});
        if (currentUser) p.set("auth_uid", currentUser);
        return p.toString();
      }

      async function apiGet(params) {
        const qs = withAuthParams(params);
        const r = await fetch(`${SCRIPT_URL}?${qs}`);
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

      function parseMediaList(mediaValue) {
        const raw = String(mediaValue || "").trim();
        if (!raw) return [];

        let items = [];
        if (raw.startsWith("[")) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) items = parsed;
          } catch (e) {}
        }
        if (items.length === 0 && raw.includes(",")) {
          items = raw.split(",");
        }
        if (items.length === 0) items = [raw];

        return items
          .map((x) => String(x || "").trim())
          .filter((x) => /^https?:\/\//i.test(x));
      }

      function renderMedia(pid, mediaValue) {
        const images = parseMediaList(mediaValue);
        if (images.length === 0) return "";
        if (images.length === 1) {
          return `<img src="${images[0]}" class="hx-media" loading="lazy" decoding="async" alt="Post image" onclick="openPostMediaViewer('${pid}', 0)">`;
        }

        mediaCarouselState[pid] = { index: 0, images: images };
        return `
          <div class="hx-carousel">
            <img id="carousel-img-${pid}" src="${images[0]}" class="hx-media" loading="lazy" decoding="async" alt="Post image" onclick="openPostMediaViewer('${pid}', mediaCarouselState['${pid}'] ? mediaCarouselState['${pid}'].index : 0)">
            <button class="carousel-btn prev" onclick="moveMediaSlide('${pid}', -1)"><i class="fas fa-chevron-left"></i></button>
            <button class="carousel-btn next" onclick="moveMediaSlide('${pid}', 1)"><i class="fas fa-chevron-right"></i></button>
            <div id="carousel-count-${pid}" class="carousel-count">1 / ${images.length}</div>
          </div>
        `;
      }

      function moveMediaSlide(pid, step) {
        const state = mediaCarouselState[pid];
        if (!state || !state.images || state.images.length === 0) return;
        state.index = (state.index + step + state.images.length) % state.images.length;
        const img = document.getElementById(`carousel-img-${pid}`);
        const count = document.getElementById(`carousel-count-${pid}`);
        if (img) img.src = state.images[state.index];
        if (count) count.innerText = `${state.index + 1} / ${state.images.length}`;
      }

      function setMediaViewerImage() {
        const img = document.getElementById("media-viewer-image");
        const count = document.getElementById("media-viewer-count");
        const cap = document.getElementById("media-viewer-caption");
        const author = document.getElementById("media-viewer-author");
        if (!img) return;
        const current = mediaViewerState.images[mediaViewerState.index] || "";
        img.src = current;
        if (count) count.innerText = `${mediaViewerState.index + 1} / ${mediaViewerState.images.length}`;
        if (cap) cap.innerText = mediaViewerState.caption || "";
        if (author) author.innerText = mediaViewerState.author ? `@${mediaViewerState.author}` : "";
      }

      function openMediaViewer(images, index, caption, author) {
        const list = Array.isArray(images) ? images.filter(Boolean) : [];
        if (list.length === 0) return;
        mediaViewerState = {
          images: list,
          index: Math.max(0, Math.min(Number(index || 0), list.length - 1)),
          caption: String(caption || ""),
          author: String(author || ""),
        };
        setMediaViewerImage();
        const modal = document.getElementById("media-viewer-modal");
        if (modal) modal.classList.add("show");
      }

      function closeMediaViewer() {
        const modal = document.getElementById("media-viewer-modal");
        if (modal) modal.classList.remove("show");
      }

      function mediaViewerMove(step) {
        if (!mediaViewerState.images.length) return;
        mediaViewerState.index =
          (mediaViewerState.index + step + mediaViewerState.images.length) %
          mediaViewerState.images.length;
        setMediaViewerImage();
      }

      function openPostMediaViewer(pid, index) {
        const state = mediaCarouselState[pid];
        if (!state || !state.images) return;
        const postCard = document.getElementById(`post-${pid}`);
        const caption = postCard ? (postCard.querySelector("div[style*='white-space:pre-wrap']")?.innerText || "") : "";
        const authorNode = postCard ? postCard.querySelector(".hx-user-row b span, .hx-user-row b") : null;
        const author = authorNode ? String(authorNode.textContent || "").replace(/^@/, "").trim() : "";
        openMediaViewer(state.images, index, caption, author);
      }

      function openProfileImageViewer(url, username) {
        if (!url) return;
        openMediaViewer([url], 0, "", username || "");
      }

      document.addEventListener("keydown", function (e) {
        const modal = document.getElementById("media-viewer-modal");
        if (!modal || !modal.classList.contains("show")) return;
        if (e.key === "Escape") closeMediaViewer();
        if (e.key === "ArrowLeft") mediaViewerMove(-1);
        if (e.key === "ArrowRight") mediaViewerMove(1);
      });

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
        const urlPattern =
          /(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;
        return text
          .replace(
            urlPattern,
            '<a href="$1" target="_blank" style="color:var(--primary);">$1</a>'
          )
          .replace(/\*(.*?)\*/g, "<b>$1</b>")
          .replace(/_(.*?)_/g, "<i>$1</i>")
          .replace(/~(.*?)~/g, "<strike>$1</strike>")
          .replace(
            /@(\w+)/g,
            (m, u) =>
              `<span onclick="viewProfile('${u}')" style="cursor:pointer">${getEliteName(
                u
              )}</span>`
          );
      }

      function updatePreview(inputId, previewId) {
        document.getElementById(previewId).innerHTML =
          linkify(document.getElementById(inputId).value) || "...";
      }

      async function uploadSingleToCatbox(file) {
        const fd = new FormData();
        fd.append("reqtype", "fileupload");
        fd.append("fileToUpload", file);
        const r = await fetch("https://catbox.moe/user/api.php", {
          method: "POST",
          body: fd
        });
        const url = await r.text();
        if (!r.ok) {
          throw new Error(`Upload failed (${r.status})`);
        }
        if (!/^https?:\/\//i.test(url.trim())) {
          throw new Error(`Upload failed: ${url || "no file"}`);
        }
        return url.trim();
      }

      async function uploadToCatbox(fileInput, hiddenId, statusId, allowMultiple) {
        const status = document.getElementById(statusId);
        const hidden = document.getElementById(hiddenId);
        const files = Array.from((fileInput && fileInput.files) || []);
        if (!status || !hidden || files.length === 0) return;

        const picked = allowMultiple ? files : [files[0]];
        const maxMb = 12;
        const valid = picked.filter((f) => String(f.type || "").startsWith("image/"));
        if (valid.length !== picked.length) {
          status.innerText = "Only image files are allowed.";
          return;
        }
        if (valid.some((f) => f.size > maxMb * 1024 * 1024)) {
          status.innerText = `Each image must be <= ${maxMb}MB`;
          return;
        }

        try {
          const urls = [];
          for (let i = 0; i < valid.length; i++) {
            status.innerText = `Uploading ${i + 1}/${valid.length}...`;
            urls.push(await uploadSingleToCatbox(valid[i]));
          }

          hidden.value = allowMultiple ? JSON.stringify(urls) : (urls[0] || "");
          if (hiddenId === "updatePfpUrl" && urls[0]) {
            const pfp = document.getElementById("pfpBig");
            if (pfp) pfp.src = urls[0];
          }
          status.innerText = `Linked ${urls.length} image${urls.length > 1 ? "s" : ""}`;
          fileInput.value = "";
        } catch (e) {
          hidden.value = "";
          status.innerText = e && e.message ? e.message : "Upload failed";
        }
      }

      function toggleAuthView(mode) {
        document.getElementById("login-view").style.display =
          mode === "login" ? "block" : "none";
        document.getElementById("signup-view").style.display =
          mode === "signup" ? "block" : "none";
      }

      async function loadFeed(force = false) {
        if (isFeedLoading) return;
        const now = Date.now();
        if (!force && now - lastFeedLoad < 5000) return;
        isFeedLoading = true;
        try {
          mediaCarouselState = {};
          const res = await apiGet({ action: "get_feed" });
          const container = document.getElementById("feed-container");
          container.innerHTML = "";
          if (!res || !Array.isArray(res.data)) {
            container.innerHTML =
              "<p style='text-align:center; padding:30px; color:var(--muted)'>Failed to load feed.</p>";
            return;
          }
          res.data.forEach((p) => {
            roleCache[p.author.toLowerCase()] = p.role;
            const hasPower = currentRole === "Admin" || currentRole === "Owner";
            const isLiked = likedPosts.includes(p.pid);
            const canMessageAuthor = p.author !== currentUser;
            const card = document.createElement("div");
            card.className = "hx-card";
            card.id = `post-${p.pid}`;
            card.innerHTML = `
            <div class="card-top-actions">
                <i class="fas fa-share hx-util-btn" onclick="sharePost('${
                  p.pid
                }')"></i>
                ${
                  canMessageAuthor
                    ? `<i class="fas fa-paper-plane hx-util-btn" onclick="startChat('${p.author}')"></i>`
                    : ""
                }
                ${
                  p.author === currentUser || hasPower
                    ? `<i class="fas fa-trash hx-util-btn" style="color:var(--error)" onclick="deletePost('${p.pid}', '${p.author}')"></i>`
                    : ""
                }
            </div>
            <div class="hx-user-row">
                <img src="${
                  p.pic || "https://ui-avatars.com/api/?name=" + p.author
                }" class="hx-pfp" loading="lazy" decoding="async" onclick="openProfileImageViewer('${(p.pic || ("https://ui-avatars.com/api/?name=" + p.author)).replace(/'/g, "\\'")}', '${String(p.author).replace(/'/g, "\\'")}')">
                <b onclick="viewProfile('${String(p.author).replace(/'/g, "\\'")}')">${getEliteName(p.author)}</b>
            </div>
            <div style="white-space:pre-wrap; margin-top:5px;">${linkify(
              p.content
            )}</div>
            ${renderMedia(p.pid, p.media)}
            <div style="margin-top:15px; display:flex; gap:25px; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px;">
                <span class="hx-action ${
                  isLiked ? "liked" : ""
                }" onclick="doLike('${p.pid}', this)"><i class="${
            isLiked ? "fas" : "far"
          } fa-heart"></i> <span class="l-count">${p.likes}</span></span>
                <span class="hx-action" onclick="openComments('${
                  p.pid
                }')"><i class="far fa-comment"></i> ${p.comment_count}</span>
            </div>`;
            container.appendChild(card);
          });
          localStorage.setItem("hx_roles_cache", JSON.stringify(roleCache));
          lastFeedLoad = now;
        } catch (e) {
          const container = document.getElementById("feed-container");
          if (container)
            container.innerHTML =
              "<p style='text-align:center; padding:30px; color:var(--muted)'>Network error loading feed.</p>";
        } finally {
          isFeedLoading = false;
        }
      }

      function openComments(pid) {
        currentActivePost = pid;
        const list = document.getElementById("full-comment-list");
        list.innerHTML =
          "<p style='text-align:center; padding:40px;'>Loading...</p>";
        openScreen("comment-view");

        apiGet({ action: "get_comments", pid: pid })
          .then((res) => {
            const comments = Array.isArray(res.data) ? res.data : [];
            if (comments.length === 0) {
              list.innerHTML =
                "<p style='text-align:center; padding:40px; color:var(--muted)'>No comments yet.</p>";
              return;
            }
            list.innerHTML = comments
              .map((c) => {
              const uname = c.user || "User";
              const safeUname = String(uname).replace(/'/g, "\\'");
              const avatar =
                c.pic ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(uname)}`;
              return `<div class="comment-item">
                <img class="comment-pfp" src="${avatar}" alt="@${uname}" loading="lazy" decoding="async" onclick="openProfileImageViewer('${avatar.replace(/'/g, "\\'")}', '${safeUname}')">
                <div class="comment-body">
                  <div class="comment-author" onclick="viewProfile('${safeUname}')" style="cursor:pointer">${getEliteName(uname)}</div>
                  <p class="comment-text">${linkify(c.text)}</p>
                </div>
              </div>`;
            })
            .join("");
          })
          .catch(() => {
            list.innerHTML =
              "<p style='text-align:center; padding:40px; color:var(--muted)'>Failed to load comments.</p>";
          });
      }

      async function sendComment() {
        const input = document.getElementById("active-comment-input");
        if (!input.value || !currentActivePost) return;
        document.getElementById("bg-loader").style.display = "block";
        await apiPost({
          action: "comment",
          pid: currentActivePost,
          uid: currentUser,
          content: input.value,
        });
        input.value = "";
        document.getElementById("comment-preview").innerHTML = "";
        document.getElementById("bg-loader").style.display = "none";
        openComments(currentActivePost);
        loadNotifications(false);
      }

      async function doLike(pid, btn) {
        if (!currentUser || likedPosts.includes(pid)) return;
        likedPosts.push(pid);
        localStorage.setItem("hx_comm_liked", JSON.stringify(likedPosts));
        btn.classList.add("liked");
        btn.querySelector("i").className = "fas fa-heart";
        const count = btn.querySelector(".l-count");
        count.innerText = parseInt(count.innerText) + 1;
        apiPost({ action: "like", pid: pid, uid: currentUser });
      }

      async function viewProfile(u) {
        if (u === currentUser) return openScreen("profile");
        viewTarget = u;
        openScreen("user-profile");
        document.getElementById("view-name").innerHTML = getEliteName(u);
        apiGet({ action: "get_user_data", uid: u })
          .then((res) => {
            const userData = (res && res.data) || {};
            document.getElementById("view-pfp").src =
              userData.pic || `https://ui-avatars.com/api/?name=${u}`;
            document.getElementById("view-pfp").onclick = function () {
              openProfileImageViewer(
                userData.pic || `https://ui-avatars.com/api/?name=${u}`,
                u
              );
            };
            document.getElementById("view-bio").innerText =
              userData.bio || "No bio.";
            roleCache[u.toLowerCase()] = (userData.role || "User").trim();
            localStorage.setItem("hx_roles_cache", JSON.stringify(roleCache));
            document.getElementById("view-name").innerHTML = getEliteName(u);
          });
        const myStats = await fetchStats(currentUser, null);
        document.getElementById("followBtn").innerText = (
          myStats.followingList || []
        ).includes(viewTarget)
          ? "Unfollow"
          : "Follow";
        await fetchStats(u, "user-profile-stats");
      }

      function checkUserStatus() {
        if (currentUser) {
          document.getElementById("login-view").style.display = "none";
          document.getElementById("profile-box").style.display = "block";
          fetchStats(currentUser, "my-stats");
          apiGet({ action: "get_user_data", uid: currentUser })
            .then((res) => {
              const userData = (res && res.data) || {};
              document.getElementById("pfpBig").src =
                userData.pic ||
                `https://ui-avatars.com/api/?name=${currentUser}`;
              document.getElementById("pfpBig").onclick = function () {
                openProfileImageViewer(
                  userData.pic || `https://ui-avatars.com/api/?name=${currentUser}`,
                  currentUser
                );
              };
              document.getElementById("bioDisplay").innerText =
                userData.bio || "No bio.";
              document.getElementById("updateBio").value = userData.bio || "";
              currentRole = (userData.role || "User").trim();
              roleCache[currentUser.toLowerCase()] = currentRole;
              localStorage.setItem("hx_comm_role", currentRole);
              localStorage.setItem("hx_roles_cache", JSON.stringify(roleCache));
              document.getElementById("nameDisplay").innerHTML =
                getEliteName(currentUser);
            });
        }
      }

      async function fetchStats(uid, elementId) {
        const res = await apiGet({ action: "get_social_stats", uid: uid });
        const stats = (res && res.data) || {};
        if (elementId)
          document.getElementById(
            elementId
          ).innerHTML = `<div class="stat-card"><span class="stat-num">${
            stats.followers || 0
          }</span><span class="stat-label">Followers</span></div><div class="stat-card"><span class="stat-num">${
            stats.following || 0
          }</span><span class="stat-label">Following</span></div>`;
        return stats;
      }

      async function toggleFollow() {
        if (!currentUser || !viewTarget || viewTarget === currentUser) return;
        await apiPost({
          action: "follow_toggle",
          uid: currentUser,
          target: viewTarget,
        });
        const myStats = await fetchStats(currentUser, null);
        document.getElementById("followBtn").innerText = (
          myStats.followingList || []
        ).includes(viewTarget)
          ? "Unfollow"
          : "Follow";
        await fetchStats(viewTarget, "user-profile-stats");
        loadNotifications(false);
      }

      async function updateProfileData() {
        const bio = document.getElementById("updateBio").value.trim();
        const pic = document.getElementById("updatePfpUrl").value.trim();
        const status = document.getElementById("profile-up-status");
        document.getElementById("bg-loader").style.display = "block";
        if (status) status.innerText = "Saving...";
        try {
          await apiPost({
            action: "update_profile",
            uid: currentUser,
            bio: bio,
            pic: pic,
          });
          document.getElementById("bioDisplay").innerText = bio || "No bio.";
          if (pic) document.getElementById("pfpBig").src = pic;
          if (status) status.innerText = "Profile saved successfully!";
          setTimeout(() => { if (status) status.innerText = ""; }, 3000);
        } catch (e) {
          if (status) status.innerText = "Failed to save profile.";
          setTimeout(() => { if (status) status.innerText = ""; }, 3000);
        } finally {
          document.getElementById("bg-loader").style.display = "none";
        }
      }

      function openCropModal(file) {
        const modal = document.getElementById("crop-modal");
        const img = document.getElementById("crop-image");
        if (!modal || !img) return;

        const url = URL.createObjectURL(file);
        img.src = url;
        modal.style.display = "flex";

        if (cropper) cropper.destroy();
        cropper = new Cropper(img, {
          aspectRatio: 1,
          viewMode: 1,
          responsive: true,
          restore: false,
          checkCrossOrigin: false,
          checkOrientation: false,
          modal: true,
          guides: true,
          center: true,
          highlight: false,
          background: false,
          autoCropArea: 0.8,
        });
      }

      function closeCropModal() {
        const modal = document.getElementById("crop-modal");
        if (modal) modal.style.display = "none";
        if (cropper) {
          cropper.destroy();
          cropper = null;
        }
      }

      async function cropAndUpload() {
        if (!cropper) return;
        const canvas = cropper.getCroppedCanvas({
          width: 300,
          height: 300,
        });
        canvas.toBlob(async (blob) => {
          const file = new File([blob], "profile.jpg", { type: "image/jpeg" });
          closeCropModal();
          await uploadToCatbox({ files: [file] }, "updatePfpUrl", "profile-up-status", false);
        }, "image/jpeg", 0.9);
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
          .filter(
            (u) =>
              u.username !== currentUser &&
              u.username.toLowerCase().includes(query)
          )
          .map((u) => {
            if (u.role) roleCache[u.username.toLowerCase()] = u.role;
            return `<div class="hx-card" style="display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="startChat('${
              u.username
            }')">
            <img src="${
              u.pic || "https://ui-avatars.com/api/?name=" + u.username
            }" class="hx-pfp" style="width:35px; height:35px;" loading="lazy" decoding="async">
            <b>${getEliteName(u.username)}</b>
        </div>`;
          })
          .join("");
        localStorage.setItem("hx_roles_cache", JSON.stringify(roleCache));
      }

      async function startChat(t) {
        if (!t) return;
        location.href = `messages.html?target=${encodeURIComponent(t)}`;
      }
      async function loadDMs() {
        const res = await apiGet({
          action: "get_dms",
          uid: currentUser,
          target: viewTarget,
        });
        const dmList = Array.isArray(res.data) ? res.data : [];
        document.getElementById("chat-messages").innerHTML = dmList
          .map(
            (m) => {
              const from = Array.isArray(m) ? m[0] : m.from;
              const text = Array.isArray(m) ? m[2] : m.text;
              return (
              `<div style="text-align:${
                from == currentUser ? "right" : "left"
              }; margin-bottom:10px;"><div style="display:inline-block; padding:8px 12px; border-radius:12px; background:${
                from == currentUser ? "var(--primary)" : "var(--card)"
              }; color:${from == currentUser ? "#000" : "#fff"}">${linkify(
                text
              )}</div></div>`
              );
            }
          )
          .join("");
        document.getElementById("chat-messages").scrollTop =
          document.getElementById("chat-messages").scrollHeight;
      }

      async function sendDM() {
        const i = document.getElementById("msgInput");
        if (!i.value) return;
        await apiPost({
          action: "dm",
          uid: currentUser,
          target: viewTarget,
          message: i.value,
        });
        i.value = "";
        loadDMs();
        loadNotifications(false);
      }

      async function submitBroadcast() {
        const t = document.getElementById("postText").value;
        const m = document.getElementById("imageUrlInput").value.trim();
        if (!String(t || "").trim() && !String(m || "").trim()) return;
        document.getElementById("bg-loader").style.display = "block";
        try {
          await apiPost({
            action: "post",
            uid: currentUser,
            content: t,
            media: m,
          });
          document.getElementById("postText").value = "";
          document.getElementById("imageUrlInput").value = "";
          document.getElementById("post-preview").innerHTML = "";
          document.getElementById("post-up-status").innerText = "";
          const postFile = document.getElementById("postFile");
          if (postFile) postFile.value = "";
          openScreen("home");
          loadFeed(true);
        } finally {
          document.getElementById("bg-loader").style.display = "none";
        }
      }

      async function deletePost(pid, author) {
        if (!confirm("Delete broadcast?")) return;
        document.getElementById(`post-${pid}`).style.display = "none";
        if (
          (currentRole === "Admin" || currentRole === "Owner") &&
          author !== currentUser
        ) {
          await apiPost({
            action: "dm",
            uid: currentUser,
            target: author,
            message:
              "*System Warning:* An admin has deleted your post. Please mind what you broadcast.",
          });
        }
        await apiPost({
          action: "delete_post",
          pid: pid,
          uid: currentUser,
        });
      }

      function openScreen(id) {
        document
          .querySelectorAll(".screen")
          .forEach((s) => s.classList.remove("active"));
        document
          .querySelectorAll(".nav-item")
          .forEach((n) => n.classList.remove("active"));
        document.getElementById(id + "-screen").classList.add("active");
        document.getElementById("nav-" + id)?.classList.add("active");
        const fab = document.getElementById("mainFab");
        fab.classList.toggle("visible", id === "home");
        if (id === "home") loadFeed();
        if (id === "notifications") loadNotifications(true);
        if (id === "dm") loadDMList();
        if (id === "profile") checkUserStatus();
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

      async function loadNotifications(forceOpen = false) {
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

          if (!forceOpen && !document.getElementById("notifications-screen")?.classList.contains("active")) {
            return;
          }

          const container = document.getElementById("notif-list-container");
          if (!container) return;
          if (list.length === 0) {
            container.innerHTML =
              "<p style='text-align:center; padding:30px; color:var(--muted)'>No notifications yet.</p>";
            return;
          }
          container.innerHTML = list
            .map(
              (n) => `<div class="notif-item ${n.read ? "" : "unread"}">
                <div class="notif-icon"><i class="fas ${getNotifIcon(
                  n.type
                )}"></i></div>
                <div class="notif-body">
                  <p class="notif-text">${linkify(n.text || "")}</p>
                  <div class="notif-time">${formatTimeAgo(n.timestamp)}</div>
                </div>
              </div>`
            )
            .join("");
        } catch (e) {}
      }

      async function markNotificationsRead() {
        if (!currentUser) return;
        await apiPost({
          action: "mark_notifications_read",
          uid: currentUser,
        });
        loadNotifications(true);
      }

      async function userAuth(mode) {
        const username = document
          .getElementById(mode === "login" ? "logUser" : "sigUser")
          .value.trim();
        const password = document
          .getElementById(mode === "login" ? "logPass" : "sigPass")
          .value.trim();
        if (!username || !password) {
          alert("Username and password are required.");
          return;
        }

        let payload = {
          action: mode,
          username: username,
          password: password,
        };
        if (mode === "signup") {
          payload.email = document.getElementById("sigEmail").value;
          payload.pic = document.getElementById("sigPfp").value;
        }
        try {
          const r = await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify(payload),
          });
          const text = await r.text();
          let res = {};
          try {
            res = JSON.parse(text);
          } catch (e) {
            alert(
              "Server did not return JSON. Check Apps Script deploy access (Anyone)."
            );
            return;
          }
          if (res.status === "Success") {
            localStorage.setItem("hx_comm_user", res.data.username);
            localStorage.setItem(
              "hx_comm_role",
              (res.data.role || "User").trim()
            );
            location.reload();
          } else alert(res.data || "Authentication failed.");
        } catch (e) {
          const msg = e && e.message ? e.message : "Unknown error";
          alert(`Auth request failed: ${msg}`);
        }
      }

      function logout() {
        localStorage.clear();
        location.reload();
      }

      function clearStaleSession() {
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
            clearStaleSession();
            return false;
          }
          return true;
        } catch (e) {
          // Do not force logout on transient network failure.
          return true;
        }
      }
      function handleFab() {
        currentUser ? openScreen("compose") : (location.href = "login.html");
      }
      function sharePost(pid) {
        const url = `${window.location.origin}${window.location.pathname}?post=${pid}`;
        if (navigator.share) navigator.share({ title: "HX Post", url: url });
        else {
          navigator.clipboard.writeText(url);
          alert("Link copied!");
        }
      }

      (async function boot() {
        const ok = await verifyStoredUser();
        if (!ok) {
          location.href = "login.html";
          return;
        }
        const viewerImg = document.getElementById("media-viewer-image");
        if (viewerImg) {
          viewerImg.addEventListener("touchstart", function (e) {
            viewerTouchStartX = (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : 0);
          });
          viewerImg.addEventListener("touchend", function (e) {
            const endX = (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : 0);
            const delta = endX - viewerTouchStartX;
            if (Math.abs(delta) < 35) return;
            mediaViewerMove(delta > 0 ? -1 : 1);
          });
        }
        loadFeed();
        loadNotifications(false);
        if (notifPollHandle) clearInterval(notifPollHandle);
        notifPollHandle = setInterval(() => {
          if (!document.hidden) loadNotifications(false);
        }, 45000);
      })();

