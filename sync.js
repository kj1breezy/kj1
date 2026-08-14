/* ============================================================================
   DriveSync — private cross-device sync via Google Drive's hidden "app data"
   folder (drive.appdata scope). That folder is invisible in the user's normal
   Drive UI and invisible to every other app — only this journal can read it.

   No backend server is involved anywhere in this file. Auth is handled
   entirely in the browser via Google Identity Services (GIS). Because there
   is no server to hold a refresh token, the access token this obtains is
   short-lived (~1hr) and re-acquired silently where possible; if silent
   re-auth fails, the UI simply asks the user to reconnect with one tap.
   Local data (localStorage) is always the source of truth for "can I use the
   app right now" — Drive is best-effort sync on top of that, never a
   requirement to read or write trades.
   ============================================================================ */
(function (global) {
  "use strict";

  var GIS_SRC = "https://accounts.google.com/gsi/client";
  var SCOPE = "https://www.googleapis.com/auth/drive.appdata";
  var FILE_NAME = "ledger-data.json";
  var CLIENT_ID_KEY = "ledger:gdrive:clientId";
  var CONNECTED_KEY = "ledger:gdrive:connected";
  var SILENT_RETRY_MS = 50 * 60 * 1000; // re-arm before the ~1hr token expiry

  var listeners = [];
  var status = {
    state: "disconnected", // disconnected | connecting | connected | error | unsupported
    email: null,
    lastSyncedAt: null,
    lastError: null
  };

  var tokenClient = null;
  var accessToken = null;
  var fileId = null; // cached Drive file id once located
  var gisLoaded = false;
  var silentTimer = null;

  function emit() {
    listeners.forEach(function (fn) {
      try { fn(Object.assign({}, status)); } catch (e) {}
    });
  }

  function setStatus(patch) {
    Object.assign(status, patch);
    emit();
  }

  function getClientId() {
    try { return localStorage.getItem(CLIENT_ID_KEY) || ""; } catch (e) { return ""; }
  }
  function setClientId(id) {
    try { localStorage.setItem(CLIENT_ID_KEY, id || ""); } catch (e) {}
  }
  function wasConnected() {
    try { return localStorage.getItem(CONNECTED_KEY) === "1"; } catch (e) { return false; }
  }
  function markConnected(on) {
    try { localStorage.setItem(CONNECTED_KEY, on ? "1" : "0"); } catch (e) {}
  }

  function loadGis() {
    if (gisLoaded && global.google && global.google.accounts) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-gis]');
      if (existing) {
        existing.addEventListener("load", function () { gisLoaded = true; resolve(); });
        existing.addEventListener("error", reject);
        return;
      }
      var s = document.createElement("script");
      s.src = GIS_SRC;
      s.async = true;
      s.defer = true;
      s.dataset.gis = "1";
      s.onload = function () { gisLoaded = true; resolve(); };
      s.onerror = function () { reject(new Error("Could not load Google Identity Services — check your connection.")); };
      document.head.appendChild(s);
    });
  }

  function ensureTokenClient() {
    var clientId = getClientId();
    if (!clientId) throw new Error("No Google Client ID set. Add one in Settings first.");
    if (tokenClient && tokenClient.__clientId === clientId) return tokenClient;
    tokenClient = global.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: function () {} // overridden per-call below
    });
    tokenClient.__clientId = clientId;
    return tokenClient;
  }

  function requestToken(promptMode) {
    return new Promise(function (resolve, reject) {
      try {
        var client = ensureTokenClient();
        client.callback = function (resp) {
          if (resp && resp.access_token) {
            accessToken = resp.access_token;
            resolve(resp.access_token);
          } else {
            reject(new Error((resp && resp.error) || "No access token returned"));
          }
        };
        client.error_callback = function (err) {
          reject(new Error((err && err.type) || "Google sign-in was cancelled or failed"));
        };
        client.requestAccessToken(promptMode === undefined ? {} : { prompt: promptMode });
      } catch (e) {
        reject(e);
      }
    });
  }

  async function fetchEmail(token) {
    try {
      var res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: "Bearer " + token }
      });
      if (!res.ok) return null;
      var data = await res.json();
      return data.email || null;
    } catch (e) { return null; }
  }

  function armSilentRefresh() {
    if (silentTimer) clearTimeout(silentTimer);
    silentTimer = setTimeout(function () {
      requestToken("").then(function () {
        armSilentRefresh();
      }).catch(function () {
        setStatus({ state: "error", lastError: "Session expired — tap Reconnect in Settings." });
      });
    }, SILENT_RETRY_MS);
  }

  async function connect(explicit) {
    if (!getClientId()) {
      setStatus({ state: "error", lastError: "No Google Client ID set yet." });
      throw new Error("No Google Client ID set yet. Paste one into Settings first — see the setup guide.");
    }
    setStatus({ state: "connecting", lastError: null });
    try {
      await loadGis();
      var token = await requestToken(explicit ? undefined : "");
      var email = await fetchEmail(token);
      setStatus({ state: "connected", email: email, lastError: null });
      markConnected(true);
      armSilentRefresh();
      return true;
    } catch (e) {
      setStatus({ state: wasConnected() ? "error" : "disconnected", lastError: e.message || String(e) });
      throw e;
    }
  }

  function disconnect() {
    accessToken = null;
    fileId = null;
    markConnected(false);
    if (silentTimer) clearTimeout(silentTimer);
    try {
      if (global.google && global.google.accounts && accessToken) {
        global.google.accounts.oauth2.revoke(accessToken, function () {});
      }
    } catch (e) {}
    setStatus({ state: "disconnected", email: null, lastError: null });
  }

  async function driveFetch(url, opts) {
    if (!accessToken) throw new Error("Not connected to Google Drive.");
    opts = opts || {};
    opts.headers = Object.assign({}, opts.headers, { Authorization: "Bearer " + accessToken });
    var res = await fetch(url, opts);
    if (res.status === 401) {
      // token expired mid-session — try one silent re-auth then retry once
      await requestToken("");
      opts.headers.Authorization = "Bearer " + accessToken;
      res = await fetch(url, opts);
    }
    return res;
  }

  async function locateFile() {
    if (fileId) return fileId;
    var url = "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=" +
      encodeURIComponent("name='" + FILE_NAME + "' and trashed=false") + "&fields=files(id,modifiedTime)";
    var res = await driveFetch(url);
    if (!res.ok) throw new Error("Drive lookup failed (" + res.status + ")");
    var data = await res.json();
    if (data.files && data.files.length) {
      fileId = data.files[0].id;
      return fileId;
    }
    return null;
  }

  async function pull() {
    if (status.state !== "connected") return null;
    var id = await locateFile();
    if (!id) return null;
    var res = await driveFetch("https://www.googleapis.com/drive/v3/files/" + id + "?alt=media");
    if (!res.ok) throw new Error("Drive read failed (" + res.status + ")");
    var text = await res.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch (e) { return null; }
  }

  async function push(payload) {
    if (status.state !== "connected") return false;
    var body = JSON.stringify(payload);
    var id = await locateFile();
    var res;
    if (id) {
      res = await driveFetch("https://www.googleapis.com/upload/drive/v3/files/" + id + "?uploadType=media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: body
      });
    } else {
      var metadata = { name: FILE_NAME, parents: ["appDataFolder"] };
      var boundary = "ledgerBoundary" + Date.now();
      var multipartBody =
        "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" +
        JSON.stringify(metadata) + "\r\n" +
        "--" + boundary + "\r\nContent-Type: application/json\r\n\r\n" +
        body + "\r\n--" + boundary + "--";
      res = await driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
        method: "POST",
        headers: { "Content-Type": "multipart/related; boundary=" + boundary },
        body: multipartBody
      });
      if (res.ok) {
        var created = await res.json();
        fileId = created.id;
      }
    }
    if (!res.ok) throw new Error("Drive write failed (" + res.status + ")");
    setStatus({ lastSyncedAt: Date.now() });
    return true;
  }

  async function tryAutoReconnect() {
    if (!wasConnected() || !getClientId()) return false;
    try {
      await connect(false);
      return true;
    } catch (e) {
      return false;
    }
  }

  global.DriveSync = {
    onStatus: function (fn) { listeners.push(fn); fn(Object.assign({}, status)); },
    getStatus: function () { return Object.assign({}, status); },
    getClientId: getClientId,
    setClientId: setClientId,
    connect: function () { return connect(true); },
    disconnect: disconnect,
    tryAutoReconnect: tryAutoReconnect,
    pull: pull,
    push: push,
    isConnected: function () { return status.state === "connected"; }
  };
})(window);
