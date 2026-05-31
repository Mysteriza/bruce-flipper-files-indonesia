function $(s) {
  return document.querySelector(s);
}
const _TMPL = $("#t");
const IS_DEV =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

/* ---- Login Auth ---- */
let _loginTesting = false;

/* Try a protected request, return status (0 = network error, 401 = need login) */
function loginTest() {
  return new Promise(function (resolve) {
    var r = new XMLHttpRequest();
    var url = IS_DEV ? "/bruce/systeminfo" : "/systeminfo";
    r.open("GET", url, true);
    r.timeout = 4000;
    r.onload = function () {
      resolve(r.status);
    };
    r.onerror = r.ontimeout = function () {
      resolve(0);
    };
    r.send();
  });
}

function loginShow() {
  document.getElementById("login-btn").disabled = false;
  document.getElementById("login-btn").textContent = "Log In";
  document.getElementById("login-error").classList.add("hidden");
  document.getElementById("login-overlay").classList.remove("hidden");
  setTimeout(function () {
    document.getElementById("login-username").focus();
  }, 100);
}

function loginHide() {
  document.getElementById("login-overlay").classList.add("hidden");
}

async function loginAuthenticate(user, pass) {
  if (_loginTesting) return;
  _loginTesting = true;
  var btn = document.getElementById("login-btn");
  var err = document.getElementById("login-error");
  err.classList.add("hidden");
  btn.disabled = true;
  btn.textContent = "Logging in...";

  try {
    var body =
      "username=" +
      encodeURIComponent(user) +
      "&password=" +
      encodeURIComponent(pass);
    var r = new XMLHttpRequest();
    var url = IS_DEV ? "/bruce/login" : "/login";
    r.open("POST", url, true);
    r.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    r.timeout = 8000;
    r.onload = function () {
      _loginTesting = false;
      if (r.status >= 200 && r.status < 400) {
        /* Cookie set by server — reload so init picks up the session */
        window.location.reload();
      } else if (r.status === 401 || r.status === 403) {
        err.textContent = "Invalid username or password.";
        err.classList.remove("hidden");
        btn.disabled = false;
        btn.textContent = "Log In";
      } else {
        err.textContent = "Unexpected server response (" + r.status + ").";
        err.classList.remove("hidden");
        btn.disabled = false;
        btn.textContent = "Log In";
      }
    };
    r.onerror = r.ontimeout = function () {
      _loginTesting = false;
      err.textContent = "Cannot reach device. Check connection.";
      err.classList.remove("hidden");
      btn.disabled = false;
      btn.textContent = "Log In";
    };
    r.send(body);
  } catch (e) {
    _loginTesting = false;
    btn.disabled = false;
    btn.textContent = "Log In";
  }
}

/* ---- End Login Auth ---- */
const T = {
  master: _TMPL,
  uploadLoading: function () {
    const tmp = document.createElement("template");
    tmp.innerHTML =
      this.master.content.querySelector(".upload-loading").outerHTML;
    return tmp.content;
  },
};

const EXECUTABLE = {
  ir: "ir tx_from_file",
  sub: "subghz tx_from_file",
  js: "js run_from_file",
  bjs: "js run_from_file",
  txt: "badusb run_from_file",
  mp3: "play",
  wav: "play",
};

/* ---- NEW: Theme CSS Cache ---- */
const ThemeCache = {
  key: "bruce_theme",
  async init() {
    try {
      var r = await fetch("/theme.css");
      var css = await r.text();
      localStorage.setItem(this.key, css);
    } catch (e) {
      // offline / dev mode — cached version used if available
    }
  },
  updateDot() {
    var dot = document.getElementById("theme-dot");
    if (!dot) return;
    var color = getComputedStyle(document.documentElement)
      .getPropertyValue("--color")
      .trim();
    if (color) dot.style.background = color;
  },
};

/* ---- NEW: Toast notification system ---- */
const Toast = {
  _queue: [],
  _visible: 0,
  _throttle: false,

  show(message, type, duration) {
    this._queue.push({
      message: message,
      type: type || "info",
      duration: duration || 3500,
    });
    this._process();
  },

  _process: function () {
    if (this._throttle) return;
    if (!this._queue.length || this._visible >= 3) return;

    this._throttle = true;
    var item = this._queue.shift();
    this._render(item);

    var self = this;
    setTimeout(function () {
      self._throttle = false;
      self._process();
    }, 650);
  },

  _render: function (item) {
    var container = document.getElementById("toast-container");
    if (!container) return;
    this._visible++;

    var el = document.createElement("div");
    el.className = "toast toast-" + item.type;
    el.innerHTML =
      '<span class="toast-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>' +
      '<span class="toast-msg">' +
      this._esc(item.message) +
      "</span>" +
      '<button class="toast-close">&times;</button>';

    var self = this;
    var timer = setTimeout(function () {
      self._remove(el);
    }, item.duration);

    el.querySelector(".toast-close").onclick = function () {
      clearTimeout(timer);
      self._remove(el);
    };

    container.appendChild(el);
    el.offsetHeight;
  },

  _remove: function (el) {
    if (!el || !el.parentNode) return;
    var self = this;
    el.classList.add("toast-out");
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
      self._visible = Math.max(0, self._visible - 1);
      self._process();
    }, 250);
  },

  success: function (m, d) {
    this.show(m, "success", d);
  },
  error: function (m, d) {
    this.show(m, "error", d);
  },
  _esc: function (s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  },
};

const DIALOG_FORM = {
  renameFolder: {
    title: "Rename Folder",
    label: "New Name:",
    action: "Rename",
  },
  renameFile: { title: "Rename File", label: "New Name:", action: "Rename" },
  createFolder: {
    title: "Create Folder",
    label: "Folder Name:",
    action: "Create Folder",
  },
  createFile: {
    title: "Create File",
    label: "File Name:",
    action: "Create File",
  },
};

/* ---- ORIGINAL Dialog (kept intact, with .confirm() added) ---- */
const Dialog = {
  _bg: function (show) {
    let bg = $(".dialog-background");
    let dialogs = document.querySelectorAll(".dialog");
    dialogs.forEach((dialog) => {
      if (!dialog.classList.contains("hidden")) dialog.classList.add("hidden");
    });
    if (show) {
      bg.classList.remove("hidden");
    } else {
      bg.classList.add("hidden");
    }
  },
  show: function (dialogName) {
    this._bg(true);
    let dialog = $(".dialog." + dialogName);
    dialog.classList.remove("hidden");
  },
  hide: function () {
    this._bg(false);
    this.loading.hide();
    LogViewer._stop();
  },
  loading: {
    show: function (message) {
      $(".loading-area").classList.remove("hidden");
      $(".loading-area .text").textContent = message || "Loading...";
    },
    hide: function () {
      $(".loading-area").classList.add("hidden");
    },
  },
  showOneInput: function (name) {
    let config = DIALOG_FORM[name];
    if (!config) {
      alert("Invalid dialog name: " + name);
      console.error("Dialog.showOneInput: Invalid dialog name", name);
      return;
    }

    let dialog = $(".dialog.oinput");
    dialog.querySelector(".oinput-title").textContent = config.title;
    dialog.querySelector(".oinput-label").textContent = config.label;
    dialog.querySelector(".oinput-file-name").textContent = "";
    dialog.querySelector(".act-save-oinput-file").textContent = config.action;
    this.show("oinput");
    dialog.querySelector("#oinput-input").value = "";
    dialog.querySelector("#oinput-input").focus();
    return dialog;
  },
  /* ---- NEW: Custom confirmation dialog ---- */
  confirm: function (opts) {
    opts = opts || {};
    var title = opts.title || "Confirm";
    var message = opts.message || "Are you sure?";
    var confirmText = opts.confirmText || "Confirm";
    var cancelText = opts.cancelText || "Cancel";
    var danger = opts.danger || false;

    return new Promise(function (resolve) {
      var bg = $(".dialog-background");
      var modal = $(".dialog.custom-confirm");

      // Hide other dialogs first
      document.querySelectorAll(".dialog").forEach(function (d) {
        if (!d.classList.contains("hidden")) d.classList.add("hidden");
      });

      document.getElementById("confirm-title").textContent = title;
      document.getElementById("confirm-message").innerHTML = message;
      var okBtn = modal.querySelector(".confirm-ok");
      okBtn.textContent = confirmText;
      modal.querySelector(".confirm-cancel").textContent = cancelText;
      if (danger) {
        okBtn.classList.add("btn-danger");
      } else {
        okBtn.classList.remove("btn-danger");
      }

      bg.classList.remove("hidden");
      modal.classList.remove("hidden");

      function cleanup() {
        bg.classList.add("hidden");
        modal.classList.add("hidden");
      }

      okBtn.onclick = function () {
        cleanup();
        resolve(true);
      };
      modal.querySelector(".confirm-cancel").onclick = function () {
        cleanup();
        resolve(false);
      };
    });
  },
};

/* ---- Log Viewer ---- */
const LogViewer = {
  _timer: null,
  _paused: false,
  _output: null,

  open: function () {
    Dialog.hide();
    this._output = document.getElementById("log-output");
    this._paused = false;
    document.getElementById("log-toggle").textContent = "Pause";
    this._output.textContent = "Connecting...";
    Dialog.show("logviewer");
    this._poll();
  },

  _poll: async function () {
    if (this._paused) return;
    try {
      var r = await requestPost("/cm", { cmnd: "log" });
      if (r && r.trim()) {
        if (
          this._output.textContent === "Connecting..." ||
          this._output.textContent === "Waiting for logs..."
        ) {
          this._output.textContent = "";
        }
        this._output.textContent += r;
        this._output.scrollTop = this._output.scrollHeight;
      } else if (this._output.textContent === "Connecting...") {
        this._output.textContent =
          "Log command not available on this firmware version.";
      }
    } catch (_) {
      if (this._output.textContent === "Connecting...") {
        this._output.textContent =
          "Log command not available on this firmware version.";
      }
    }
    if (!this._paused) this._timer = setTimeout(this._poll.bind(this), 3000);
  },

  _stop: function () {
    this._paused = true;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  },

  toggle: function () {
    this._paused = !this._paused;
    document.getElementById("log-toggle").textContent = this._paused
      ? "Resume"
      : "Pause";
    if (!this._paused) this._poll();
  },

  clear: function () {
    this._output.textContent = "";
  },
};

/* ---- Serial Command Dialog ---- */
const SERIAL_COMMANDS = [
  {
    cat: "Navigation",
    cmds: [
      { c: "nav up [duration]", d: "Press Up button" },
      { c: "nav down [duration]", d: "Press Down button" },
      { c: "nav left [duration]", d: "Press Left button" },
      { c: "nav right [duration]", d: "Press Right button" },
      { c: "nav sel [duration]", d: "Press Select/OK" },
      { c: "nav esc [duration]", d: "Press Back/Esc" },
      { c: "nav next [duration]", d: "Next menu item" },
      { c: "nav prev [duration]", d: "Previous menu item" },
      { c: "nav nextpage [duration]", d: "Next page" },
      { c: "nav prevpage [duration]", d: "Previous page" },
      { c: "options <run>", d: "List or select a menu option" },
      { c: "optionsJSON", d: "Options as JSON" },
    ],
  },
  {
    cat: "System Info",
    cmds: [
      { c: "info", d: "Version, SDK, MAC, WiFi, Device" },
      { c: "uptime", d: "Uptime since boot" },
      { c: "date", d: "Current date/time" },
      { c: "free", d: "Free heap & PSRAM" },
      { c: "i2c", d: "Scan I2C bus" },
      { c: "help", d: "List all commands" },
    ],
  },
  {
    cat: "Power",
    cmds: [
      { c: "poweroff", d: "Deep sleep" },
      { c: "reboot", d: "Reboot device" },
      { c: "sleep", d: "Sleep mode" },
      { c: "power off", d: "Deep sleep (subcommand)" },
      { c: "power reboot", d: "Reboot (subcommand)" },
      { c: "power sleep", d: "Sleep (subcommand)" },
    ],
  },
  {
    cat: "Display",
    cmds: [
      { c: "display start", d: "Start async serial logging" },
      { c: "display stop", d: "Stop async serial logging" },
      { c: "display status", d: "Get logging state" },
      { c: "display dump", d: "Dump binary log" },
      { c: "display info", d: "Display info (res, rotation)" },
    ],
  },
  {
    cat: "Screen / UI",
    cmds: [
      { c: "clock", d: "Show clock UI" },
      { c: "screen br <0-255>", d: "Set brightness (0-255, maps to 0-100%)" },
      { c: "screen color hex <hex>", d: "Set UI color (6 hex chars)" },
      { c: "screen color rgb <r> <g> <b>", d: "Set UI color (0-255 each)" },
    ],
  },
  {
    cat: "Storage (top-level)",
    cmds: [
      { c: "ls [path]", d: "List directory" },
      { c: "cat <path>", d: "Read file contents" },
      { c: "rm <path>", d: "Delete file" },
      { c: "md <path>", d: "Create directory" },
      { c: "rmdir <path>", d: "Remove directory" },
      { c: "md5 <path>", d: "File MD5 hash" },
      { c: "crc32 <path>", d: "File CRC32" },
    ],
  },
  {
    cat: "Storage (extended)",
    cmds: [
      { c: "storage list [path]", d: "List directory" },
      { c: "storage read <path>", d: "Read file" },
      { c: "storage remove <path>", d: "Delete file" },
      { c: "storage rename <path> <name>", d: "Rename file" },
      { c: "storage copy <path> <dest>", d: "Copy file" },
      { c: "storage mkdir <path>", d: "Create directory" },
      { c: "storage rmdir <path>", d: "Remove directory" },
      { c: "storage md5 <path>", d: "File MD5" },
      { c: "storage crc32 <path>", d: "File CRC32" },
      { c: "storage stat <path>", d: "File info (size, date)" },
      { c: "storage free <sd|littlefs>", d: "Show free space" },
      { c: "storage write <path> <size>", d: "Write file from serial" },
      { c: "storage ymodem <path>", d: "Receive file via YModem" },
    ],
  },
  {
    cat: "Loader / App Launcher",
    cmds: [
      { c: "loader list", d: "List available apps" },
      { c: "loader open <appname>", d: "Launch an app" },
    ],
  },
  {
    cat: "IR",
    cmds: [
      { c: "ir rx [--raw]", d: "Read IR signal (decoded or raw)" },
      {
        c: "ir tx <proto> <addr> <cmd>",
        d: "Send IR (e.g. NEC 04000000 08000000)",
      },
      { c: "ir tx_raw <freq> <samples>", d: "Send IR raw waveform" },
      { c: "ir tx_from_file <path> [hideUI]", d: "Send IR from .ir file" },
      {
        c: 'IRSend {"Protocol":"NEC","Data":"0x..."}',
        d: "Tasmota-compatible IR JSON",
      },
    ],
  },
  {
    cat: "RF / SubGHz",
    cmds: [
      { c: "subghz rx <freq> [--raw]", d: "Read RF signal" },
      { c: "subghz tx <key> <freq> <te> <cnt>", d: "Send RF code" },
      { c: "subghz scan <start_mhz> <stop_mhz>", d: "Scan frequency range" },
      { c: "subghz tx_from_file <path> [hideUI]", d: "Send RF from .sub file" },
      {
        c: 'RfSend {"Data":"0x...","Bits":24}',
        d: "Tasmota-compatible RF JSON",
      },
    ],
  },
  {
    cat: "WiFi",
    cmds: [
      { c: "wifi on", d: "Connect to known WiFi / start AP" },
      { c: "wifi off", d: "Disconnect WiFi" },
      { c: "wifi add <ssid> <pass>", d: "Add a WiFi credential" },
      { c: "webui [--noAp]", d: "Start WebUI" },
      { c: "arp", d: "ARP scan hosts" },
      { c: "listen", d: "TCP port listener" },
      { c: "sniffer", d: "Raw WiFi sniffer" },
    ],
  },
  {
    cat: "GPIO",
    cmds: [
      { c: "gpio mode <pin> <0|1>", d: "Set pin mode (0=input, 1=output)" },
      { c: "gpio set <pin> <0|1>", d: "Set pin (0=low, 1=high)" },
      { c: "gpio read <pin>", d: "Read pin value" },
    ],
  },
  {
    cat: "Settings",
    cmds: [
      { c: "settings", d: "View all settings" },
      { c: "settings <name>", d: "View a single setting" },
      { c: "settings <name> <value>", d: "Change a setting" },
      { c: "factory_reset", d: "Reset to factory defaults" },
    ],
  },
  {
    cat: "Sound",
    cmds: [
      { c: "tone <freq> <dur>", d: "Play tone (Hz, ms)" },
      { c: "play <path_or_rtttl>", d: "Play audio file or RTTTL" },
      { c: "tts <text>", d: "Text-to-speech" },
    ],
  },
  {
    cat: "BadUSB",
    cmds: [{ c: "badusb run_from_file <path>", d: "Run DuckyScript file" }],
  },
  {
    cat: "JS Interpreter",
    cmds: [
      { c: "js run_from_file <path>", d: "Run JavaScript file" },
      { c: "js run_from_buffer <size>", d: "Run JS from serial input" },
      { c: "js exit", d: "Exit JS interpreter" },
      { c: "js <path>", d: "Run JS (flipper-compat shorthand)" },
    ],
  },
  {
    cat: "Crypto",
    cmds: [
      {
        c: "crypto decrypt_from_file <path> <pwd>",
        d: "Decrypt an encrypted file",
      },
      { c: "crypto encrypt_to_file <path> <pwd>", d: "Encrypt a file" },
      { c: "crypto type_from_file <path> <pwd>", d: "Decrypt & type via HID" },
      { c: "decrypt <path> <pwd>", d: "Decrypt (top-level alias)" },
      { c: "encrypt <path> <pwd>", d: "Encrypt (top-level alias)" },
    ],
  },
];

const SerialDialog = {
  open: function () {
    Dialog.hide();
    Dialog._bg(true);
    var d = document.querySelector(".dialog.serial");
    d.classList.remove("hidden");
    var inp = document.getElementById("serial-input");
    inp.value = "";
    this._buildList("");
    inp.focus();
    inp.selectionStart = inp.selectionEnd = inp.value.length;
  },

  _buildList: function (q) {
    q = q.toLowerCase().trim();
    var list = document.getElementById("serial-list");
    list.innerHTML = "";

    SERIAL_COMMANDS.forEach(function (group) {
      var matching = group.cmds.filter(function (cmd) {
        return (
          !q ||
          cmd.c.toLowerCase().indexOf(q) !== -1 ||
          cmd.d.toLowerCase().indexOf(q) !== -1
        );
      });
      if (!matching.length && q) return;

      if (!q) {
        var cat = document.createElement("div");
        cat.className = "s-cat";
        cat.textContent = group.cat;
        list.appendChild(cat);
      }
      matching.forEach(function (cmd) {
        var el = document.createElement("div");
        el.className = "s-item";
        var span = document.createElement("span");
        span.textContent = cmd.c;
        el.appendChild(span);
        if (!q) {
          var desc = document.createElement("span");
          desc.className = "s-desc";
          desc.textContent = cmd.d;
          el.appendChild(desc);
        }
        el._cmd = cmd.c;
        el.addEventListener("click", function () {
          var inp = document.getElementById("serial-input");
          inp.value = this._cmd;
          inp.focus();
        });
        list.appendChild(el);
      });
    });

    if (!list.children.length) {
      var empty = document.createElement("div");
      empty.className = "s-empty";
      empty.textContent = "No matching commands for \u201c" + q + "\u201d.";
      list.appendChild(empty);
    }
  },

  send: function () {
    var cmd = document.getElementById("serial-input").value.trim();
    if (!cmd) {
      Toast.error("Type a command.");
      return;
    }
    Dialog.hide();
    runCommand(cmd);
  },
};

const REQ_TIMEOUT = 10000;
const REQ_RETRIES = 2;

async function requestGet(url, data) {
  return _requestWithRetry("GET", url, data, null);
}

async function requestPost(url, data) {
  return _requestWithRetry("POST", url, data, data);
}

function _requestWithRetry(method, url, params, body, attempt) {
  if (attempt === undefined) attempt = 0;
  return new Promise((resolve, reject) => {
    let req = new XMLHttpRequest();
    let realUrl = url;
    if (IS_DEV) realUrl = "/bruce" + url;
    if (method === "GET" && params) {
      realUrl += "?" + new URLSearchParams(params).toString();
    }
    req.open(method, realUrl, true);
    req.timeout = REQ_TIMEOUT;
    req.onload = () => {
      if (req.status >= 200 && req.status < 300) {
        resolve(req.responseText);
      } else {
        if (attempt < REQ_RETRIES && req.status >= 500) {
          setTimeout(
            () =>
              resolve(
                _requestWithRetry(method, url, params, body, attempt + 1),
              ),
            1000 * (attempt + 1),
          );
        } else {
          reject(new Error("Request failed with status " + req.status));
        }
      }
    };
    req.ontimeout = () => {
      if (attempt < REQ_RETRIES) {
        setTimeout(
          () =>
            resolve(_requestWithRetry(method, url, params, body, attempt + 1)),
          1000 * (attempt + 1),
        );
      } else {
        reject(new Error("Request timed out"));
      }
    };
    req.onerror = () => {
      if (attempt < REQ_RETRIES) {
        setTimeout(
          () =>
            resolve(_requestWithRetry(method, url, params, body, attempt + 1)),
          1000 * (attempt + 1),
        );
      } else {
        reject(new Error("Network error"));
      }
    };
    if (method === "POST") {
      let fd = new FormData();
      for (let key in body) {
        if (body.hasOwnProperty(key)) fd.append(key, body[key]);
      }
      req.send(fd);
    } else {
      req.send();
    }
  });
}

function stringToId(str) {
  let hash = 0,
    i,
    chr;
  if (str.length === 0) return hash.toString();
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return "id_" + Math.abs(hash);
}

const _queueUpload = [];
let _runningUpload = false;
function appendFileToQueue(files) {
  Dialog.show("upload");
  let d = $(".dialog.upload");
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    let filename = file.webkitRelativePath || file.name;
    let fileId = stringToId(filename);
    let progressBar = T.uploadLoading();
    progressBar.querySelector(".upload-name").textContent = filename;
    progressBar
      .querySelector(".upload-loading .bar")
      .setAttribute("id", fileId);

    d.querySelector(".dialog-body").appendChild(progressBar);
  }
}
async function appendDroppedFiles(entry) {
  return new Promise((resolve, reject) => {
    if (entry.isFile) {
      entry.file((file) => {
        let fileWithPath = new File([file], entry.fullPath.substring(1), {
          type: file.type,
        });
        appendFileToQueue([fileWithPath]);
        _queueUpload.push(fileWithPath);
        resolve();
      });
    } else if (entry.isDirectory) {
      let proms = [];
      let reader = entry.createReader();
      reader.readEntries((entries) => {
        for (let e of entries) proms.push(appendDroppedFiles(e));
      });

      Promise.all(proms).then(resolve);
    }
  });
}

async function runCommand(cmd) {
  Dialog.loading.show("Running command...");
  try {
    await requestPost("/cm", { cmnd: cmd });
    Toast.success("Command executed");
  } catch (error) {
    Toast.error("Command failed. Make sure the device is connected.");
  } finally {
    Dialog.loading.hide();
  }
}

function getSerialCommand(fileName) {
  let extension = fileName.split(".");
  if (extension.length > 1) {
    extension = extension[extension.length - 1].toLowerCase();
    return EXECUTABLE[extension];
  }

  return undefined;
}

function calcHash(str) {
  let hash = 5381;
  str = str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i); // djb2 xor variant
    hash = hash >>> 0; // force unsigned 32-bit
  }

  return hash.toString(16).padStart(8, "0");
}

let currentDrive;
let currentPath;
async function fetchFiles(drive, path) {
  currentDrive = drive;
  currentPath = path;
  $(".block-space.active")?.classList.remove("active");
  var driveBtn = document.querySelector(
    ".block-space[data-drive='" + drive + "']",
  );
  if (driveBtn) driveBtn.classList.add("active");
  $(".current-path").textContent = drive + ":/" + path;
  Dialog.loading.show("Fetching files...");
  try {
    let req = await requestGet("/listfiles", {
      fs: drive,
      folder: path,
    });
    renderFileRow(req);
  } catch (e) {
    Toast.error(
      "Could not load file list. Make sure the device is connected and try again.",
    );
  }
  Dialog.loading.hide();
}

let _sysInfoErrorShown = false;

async function fetchSystemInfo() {
  Dialog.loading.show("Fetching system info...");
  try {
    let req = await requestGet("/systeminfo");
    _sysInfoErrorShown = false;
    let info = JSON.parse(req);
    var ver = info.BRUCE_VERSION || "?";
    $(".bruce-version").textContent = ver;
    document.getElementById("sys-version").textContent = ver;
    var sd = info.SD,
      lfs = info.LittleFS;
    var sdEl = $(".free-space .free-sd span");
    var fsEl = $(".free-space .free-fs span");
    if (sdEl) sdEl.innerHTML = sd ? sd.used + " / " + sd.total : "0 MB";
    if (fsEl) fsEl.innerHTML = lfs ? lfs.used + " / " + lfs.total : "0 MB";
    document.getElementById("sys-sd").textContent = sd
      ? sd.used + " / " + sd.total
      : "N/A";
    document.getElementById("sys-lfs").textContent = lfs
      ? lfs.used + " / " + lfs.total
      : "N/A";

    /* Try optional info via /cm */
    fetchOptionalInfo("uptime", "sys-uptime");
    fetchOptionalInfo("battery", "sys-battery");
    fetchOptionalInfo("heap", "sys-heap");
  } catch (e) {
    if (!_sysInfoErrorShown) {
      _sysInfoErrorShown = true;
      Toast.error(
        "Could not retrieve device info. The device may be disconnected.",
      );
    }
  }
  Dialog.loading.hide();
}

async function fetchOptionalInfo(cmd, elId) {
  try {
    var r = await requestPost("/cm", { cmnd: cmd });
    var val = (r || "").trim();
    if (val) document.getElementById(elId).textContent = val;
  } catch (_) {
    /* command not supported */
  }
}

async function saveEditorFile(runFile = false) {
  Dialog.loading.show("Saving...");
  let editor = $(".dialog.editor .file-content");
  let filename = $(".dialog.editor .editor-file-name").textContent.trim();
  if (isModified(editor)) {
    $(".act-save-edit-file").disabled = true;
    editor.setAttribute("data-hash", calcHash(editor.value));
    try {
      await requestPost("/edit", {
        fs: currentDrive,
        name: filename,
        content: editor.value,
      });
      Toast.success("File saved");
    } catch (e) {
      Toast.error(
        "Could not save the file. Check your connection and try again.",
      );
    }
  }

  if (runFile) {
    let serial = getSerialCommand(filename);
    if (serial !== undefined) {
      await runCommand(serial + " " + filename);
    }
  }
  Dialog.loading.hide();
}

function isModified(target) {
  let oldHash = target.getAttribute("data-hash");
  let newHash = calcHash(target.value);
  return oldHash !== newHash;
}

async function openNavigator() {
  Dialog.show("navigator");
  await reloadScreen();
  autoReloadScreen();
}

let SCREEN_NAVIGATING = false;
async function runNavigation(direction) {
  if (SCREEN_NAVIGATING) return;
  SCREEN_NAVIGATING = true;
  try {
    drawCanvasLoading();
    await requestPost("/cm", { cmnd: "nav " + direction.toLowerCase() });
    await reloadScreen();
  } catch (error) {
    Toast.error("Navigation command failed. The device may not be responding.");
  } finally {
    SCREEN_NAVIGATING = false;
  }
}

const btnForceReload = $("#force-reload");
let SCREEN_RELOAD = false;
async function reloadScreen() {
  if (SCREEN_RELOAD) return;
  SCREEN_RELOAD = true;
  btnForceReload.classList.add("reloading");
  try {
    let screenReq = await requestGet("/getscreen");
    var screenData = JSON.parse(screenReq);
    await renderTFT(screenData);
  } catch (error) {
    console.error("Failed to reload screen:", error);
  } finally {
    btnForceReload.classList.remove("reloading");
    SCREEN_RELOAD = false;
  }
}

const eConfigAutoReload = $("#navigator-auto-reload");
let AUTO_RELOAD_SCREEN = null;
async function taskReloader() {
  let timer = parseInt(eConfigAutoReload.value);
  let navigatorOpen = $(".dialog.navigator:not(.hidden)");
  if (timer <= 0 || !navigatorOpen) {
    if (AUTO_RELOAD_SCREEN) {
      clearTimeout(AUTO_RELOAD_SCREEN);
      AUTO_RELOAD_SCREEN = null;
    }

    return;
  }

  await reloadScreen();
  setTimeout(taskReloader, timer);
  // better use setTimeout instead of setInterval to avoid overlapping calls
}
async function autoReloadScreen() {
  let timer = parseInt(eConfigAutoReload.value);

  if (AUTO_RELOAD_SCREEN) {
    clearTimeout(AUTO_RELOAD_SCREEN);
    AUTO_RELOAD_SCREEN = null;
  }

  if (timer > 0) taskReloader();
}

/// TFT RENDER
let loadingDrawn = false;
const IMG_CACHE_MAX = 30;
const imageCache = {};
const _cacheKeys = [];
function _cacheImage(url, img) {
  if (imageCache[url]) return;
  if (_cacheKeys.length >= IMG_CACHE_MAX) {
    var old = _cacheKeys.shift();
    delete imageCache[old];
  }
  _cacheKeys.push(url);
  imageCache[url] = img;
}
async function renderTFT(data) {
  loadingDrawn = false;
  const canvas = $("#navigator-screen");
  const ctx = canvas.getContext("2d");

  const loadImage = async (url) => {
    if (imageCache[url]) return imageCache[url];
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        _cacheImage(url, img);
        resolve(img);
      };
      img.onerror = (err) => reject(err);
      img.src = url;
    });
  };

  const drawImageCached = async (img_url, input) => {
    let img = await loadImage(img_url);
    let drawX = input.x;
    let drawY = input.y;

    if (input.center === 1) {
      drawX += (canvas.width - img.width) / 2;
      drawY += (canvas.height - img.height) / 2;
    }
    ctx.drawImage(img, drawX, drawY);
  };

  const color565toCSS = (color565) => {
    const r = (((color565 >> 11) & 0x1f) * 255) / 31;
    const g = (((color565 >> 5) & 0x3f) * 255) / 63;
    const b = ((color565 & 0x1f) * 255) / 31;
    return `rgb(${r},${g},${b})`;
  };

  const drawRoundRect = (ctx, input, fill) => {
    const { x, y, w, h, r } = input;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    else ctx.stroke();
  };

  for (const { fn, in: input } of data) {
    ctx.beginPath();

    switch (fn) {
      case 99: // SCREEN_INFO
        canvas.width = input.width;
        canvas.height = input.height;
      case 0: // FILLSCREEN
        ctx.fillStyle = color565toCSS(input.fg);
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        break;

      case 1: // DRAWRECT
        ctx.strokeStyle = color565toCSS(input.fg);
        ctx.strokeRect(input.x, input.y, input.w, input.h);
        break;

      case 2: // FILLRECT
        ctx.fillStyle = color565toCSS(input.fg);
        ctx.fillRect(input.x, input.y, input.w, input.h);
        break;

      case 3: // DRAWROUNDRECT
        ctx.strokeStyle = color565toCSS(input.fg);
        drawRoundRect(ctx, input, false);
        break;

      case 4: // FILLROUNDRECT
        ctx.fillStyle = color565toCSS(input.fg);
        drawRoundRect(ctx, input, true);
        break;

      case 5: // DRAWCIRCLE
        ctx.strokeStyle = color565toCSS(input.fg);
        ctx.arc(input.x, input.y, input.r, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 6: // FILLCIRCLE
        ctx.fillStyle = color565toCSS(input.fg);
        ctx.arc(input.x, input.y, input.r, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 7: // DRAWTRIANGLE
        ctx.strokeStyle = color565toCSS(input.fg);
        ctx.beginPath();
        ctx.moveTo(input.x, input.y);
        ctx.lineTo(input.x2, input.y2);
        ctx.lineTo(input.x3, input.y3);
        ctx.closePath();
        ctx.stroke();
        break;

      case 8: // FILLTRIANGLE
        ctx.fillStyle = color565toCSS(input.fg);
        ctx.beginPath();
        ctx.moveTo(input.x, input.y);
        ctx.lineTo(input.x2, input.y2);
        ctx.lineTo(input.x3, input.y3);
        ctx.closePath();
        ctx.fill();
        break;
      case 9: // DRAWELLIPSE
        ctx.strokeStyle = color565toCSS(input.fg);
        ctx.beginPath();
        ctx.ellipse(input.x, input.y, input.rx, input.ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 10: // FILLELLIPSE
        ctx.fillStyle = color565toCSS(input.fg);
        ctx.beginPath();
        ctx.ellipse(input.x, input.y, input.rx, input.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 11: // DRAWLINE
        ctx.strokeStyle = color565toCSS(input.fg);
        ctx.moveTo(input.x, input.y);
        ctx.lineTo(input.x1, input.y1);
        ctx.stroke();
        break;

      case 12: // DRAWARC
        ctx.strokeStyle = color565toCSS(input.fg);
        ctx.lineWidth = input.r - input.ir || 1;
        const sa = ((input.startAngle + 90 || 0) * Math.PI) / 180;
        const ea = ((input.endAngle + 90 || 0) * Math.PI) / 180;
        const radius = (input.r + input.ir) / 2;
        ctx.beginPath();
        ctx.arc(input.x, input.y, radius, sa, ea);
        ctx.stroke();
        break;

      case 13: // DRAWWIDELINE
        ctx.strokeStyle = color565toCSS(input.fg);
        ctx.lineWidth = input.wd || 1;
        ctx.moveTo(input.x, input.y);
        ctx.lineTo(input.bx, input.by);
        ctx.stroke();
        break;

      case 14: // DRAWCENTRESTRING
      case 15: // DRAWRIGHTSTRING
      case 16: // DRAWSTRING
      case 17: // PRINT
        // This must be enhanced to make font width be multiple of 6px, the font used here is multiple of 4.5px,
        // "\n" are not treated, and long lines do not split into multi lines..
        if (input.bg == input.fg) {
          input.bg = 0;
        }
        ctx.fillStyle = color565toCSS(input.bg);

        input.txt = input.txt.replaceAll("\\n", ""); // remove new lines
        var fw = input.size === 3 ? 13.5 : input.size === 2 ? 9 : 4.5;
        var o = 0;
        if (fn === 15) o = input.txt.length * fw;
        if (fn === 14) o = (input.txt.length * fw) / 2;
        // draw a rectangle at the text area, to avoid overlapping texts
        ctx.fillRect(
          input.x - o,
          input.y,
          input.txt.length * fw,
          input.size * 8,
        );

        ctx.fillStyle = color565toCSS(input.fg);
        ctx.font = input.size * 8 + "px monospace";
        ctx.textBaseline = "top";
        ctx.textAlign = fn === 14 ? "center" : fn === 15 ? "right" : "left";
        ctx.fillText(input.txt, input.x, input.y);
        break;

      case 18: // DRAWIMAGE
        let url =
          "/file?fs=" +
          input.fs +
          "&name=" +
          encodeURIComponent(input.file) +
          "&action=image";
        if (IS_DEV) url = "/bruce" + url;
        await drawImageCached(url, input);
        break;

      case 19: // DRAWPIXEL
        ctx.fillStyle = color565toCSS(input.fg);
        ctx.fillRect(input.x, input.y, 1, 1);
        break;
      case 20: // DRAWFASTVLINE
        ctx.fillStyle = color565toCSS(input.fg);
        ctx.fillRect(input.x, input.y, 1, input.h);
        break;

      case 21: // DRAWFASTHLINE
        ctx.fillStyle = color565toCSS(input.fg);
        ctx.fillRect(input.x, input.y, input.w, 1);
        break;
    }
  }
}
function drawCanvasLoading() {
  if (loadingDrawn) return;
  loadingDrawn = true;
  const canvas = $("#navigator-screen");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  // Draw semi-transparent black background
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1.0;

  // Draw "Loading" text in the center
  ctx.fillStyle = "#fff";
  ctx.font = "bold 14px 'DejaVu Sans Mono', Consolas, Menlo";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Navigating...", width / 2, height / 2);
  ctx.restore();
}

let oldTimerSession = sessionStorage.getItem("autoReload") || "0";
var autoOpt = eConfigAutoReload.querySelector(
  'option[value="' + oldTimerSession + '"]',
);
if (autoOpt) autoOpt.selected = true;
eConfigAutoReload.addEventListener("change", async (e) => {
  e.preventDefault();
  autoReloadScreen();
  sessionStorage.setItem("autoReload", eConfigAutoReload.value);
});

btnForceReload.addEventListener("click", async (e) => {
  e.preventDefault();
  drawCanvasLoading();
  await reloadScreen();
});

document.querySelectorAll(".inp-uploader").forEach((el) => {
  el.addEventListener("change", async (e) => {
    let files = e.target.files;
    if (!files || files.length === 0) return;

    appendFileToQueue(files);
    _queueUpload.push(...files);
    if (!_runningUpload) uploadFile();

    e.target.value = "";
  });
});

$(".container").addEventListener("click", async (e) => {
  let browseAction = e.target.closest(".act-browse");
  if (browseAction) {
    e.preventDefault();
    let drive =
      browseAction.getAttribute("data-drive") || currentDrive || "LittleFS";
    let path =
      browseAction.getAttribute("data-path") ||
      browseAction.closest("tr").getAttribute("data-path") ||
      "/";
    if (drive === currentDrive && path === currentPath) return;

    fetchFiles(drive, path);
    return;
  }

  let editFileAction = e.target.closest(".act-edit-file");
  if (editFileAction) {
    e.preventDefault();
    let editor = $(".dialog.editor .file-content");
    let file = editFileAction.closest("tr").getAttribute("data-file");
    if (!file) return;
    $(".dialog.editor .editor-file-name").textContent = file;
    editor.value = "";

    // Load file content
    Dialog.loading.show("Fetching content...");
    try {
      let r = await requestGet(
        "/file?fs=" +
          currentDrive +
          "&name=" +
          encodeURIComponent(file) +
          "&action=edit",
      );
      editor.value = r;
      editor.setAttribute("data-hash", calcHash(r));

      $(".act-save-edit-file").disabled = true;

      let serial = getSerialCommand(file);
      if (serial === undefined) {
        $(".act-run-edit-file").classList.add("hidden");
      } else {
        $(".act-run-edit-file").classList.remove("hidden");
      }
    } catch (err) {
      Toast.error(
        "Could not open the file. It may have been deleted or moved.",
      );
    }

    Dialog.loading.hide();
    Dialog.show("editor");
    return;
  }

  let oActionOInput = e.target.closest(".act-oinput");
  if (oActionOInput) {
    e.preventDefault();
    let action = oActionOInput.getAttribute("data-action");
    if (!action) return;

    if (action === "serial") {
      SerialDialog.open();
      return;
    }

    let filePath = currentPath;
    let d = Dialog.showOneInput(action);
    if (action.startsWith("rename")) {
      let row = oActionOInput.closest("tr");
      filePath = row.getAttribute("data-file") || row.getAttribute("data-path");
    }

    d.setAttribute("data-cache", action + "|" + filePath);
    if (filePath != "") {
      let fName = filePath.substring(filePath.lastIndexOf("/") + 1);
      let fNameSpan = d.querySelector(".oinput-file-name");
      fNameSpan.textContent = ": " + fName;
      fNameSpan.setAttribute("title", fName);
    }

    return;
  }

  let actDeleteFile = e.target.closest(".act-delete");
  if (actDeleteFile) {
    e.preventDefault();
    var file =
      actDeleteFile.closest(".file-row").getAttribute("data-file") ||
      actDeleteFile.closest(".file-row").getAttribute("data-path");
    if (!file) return;

    var confirmed = await Dialog.confirm({
      title: "Delete",
      message:
        "Are you sure you want to DELETE <strong>" +
        file +
        "</strong>?<br><br>This action <strong>cannot be undone</strong>!",
      confirmText: "Delete",
      danger: true,
    });
    if (!confirmed) return;

    Dialog.loading.show("Deleting...");
    try {
      await requestGet("/file", {
        fs: currentDrive,
        action: "delete",
        name: file,
      });
      Toast.success("Deleted: " + file);
    } catch (err) {
      Toast.error("Could not delete the file. It may be locked or protected.");
    }
    Dialog.loading.hide();
    fetchSystemInfo();
    fetchFiles(currentDrive, currentPath);
    return;
  }

  let actPlay = e.target.closest(".act-play");
  if (actPlay) {
    e.preventDefault();
    let cmd = actPlay.getAttribute("data-cmd");
    if (!cmd) return;

    actPlay.blur();
    await runCommand(cmd);
    return;
  }
});

$(".dialog-background").addEventListener("click", function (e) {
  if (e.target.matches(".act-dialog-close")) {
    e.preventDefault();
    Dialog.hide();
    return;
  }
  if (e.target === $(".dialog-background")) {
    var customConfirm = $(".dialog.custom-confirm:not(.hidden)");
    if (customConfirm) return;
    if ($(".dialog.editor:not(.hidden)")) {
      var editor = $(".dialog.editor .file-content");
      if (isModified(editor)) {
        Dialog.confirm({
          title: "Unsaved Changes",
          message: "You have unsaved changes. Discard them?",
          confirmText: "Discard",
          danger: false,
        }).then(function (ok) {
          if (ok) Dialog.hide();
        });
        return;
      }
    }
    var anyEscape = $(".dialog:not(.hidden) .act-escape");
    if (anyEscape) anyEscape.click();
  }
});

$(".act-save-oinput-file").addEventListener("click", async (e) => {
  let dialog = $(".dialog.oinput");
  let fileInput = $("#oinput-input");
  let fileName = fileInput.value.trim();
  if (!fileName) {
    Toast.error("Filename cannot be empty.");
    return;
  }
  let action = dialog.getAttribute("data-cache");
  if (!action) {
    Toast.error("No action specified.");
    return;
  }

  let refreshList = true;
  let [actionType, path] = action.split("|");
  try {
    if (actionType.startsWith("rename")) {
      Dialog.loading.show("Renaming...");
      await requestPost("/rename", {
        fs: currentDrive,
        filePath: path,
        fileName: fileName,
      });
    } else if (actionType === "createFolder") {
      Dialog.loading.show("Creating Folder...");
      let urlQuery = new URLSearchParams({
        fs: currentDrive,
        action: "create",
        name: path.trimEnd("/") + "/" + fileName,
      });
      await requestGet("/file?" + urlQuery.toString());
    } else if (actionType === "createFile") {
      Dialog.loading.show("Creating File...");
      let urlQuery = new URLSearchParams({
        fs: currentDrive,
        action: "createfile",
        name: path.trimEnd("/") + "/" + fileName,
      });
      await requestGet("/file?" + urlQuery.toString());
    }
  } catch (err) {
    Toast.error("Something went wrong. Please try again.");
  }

  if (refreshList) fetchFiles(currentDrive, currentPath);
  Dialog.hide();
});

$(".act-save-credential").addEventListener("click", async (e) => {
  let username = $("#cred-username").value.trim();
  let password = $("#cred-password").value.trim();
  if (!username || !password) {
    Toast.error("Username and password cannot be empty.");
    return;
  }

  Dialog.loading.show("Saving WiFi Credentials...");
  try {
    await requestGet("/wifi", {
      usr: username,
      pwd: password,
    });
    Toast.success("Credentials saved!");
    Dialog.hide();
  } catch (err) {
    Toast.error("Could not save credentials. Check the device connection.");
  }
  Dialog.loading.hide();
});

document.getElementById("log-clear").addEventListener("click", function () {
  LogViewer.clear();
});

document.getElementById("log-toggle").addEventListener("click", function () {
  LogViewer.toggle();
});

$(".act-save-edit-file").addEventListener("click", async (e) => {
  await saveEditorFile();
});

const runEditorBtn = $(".act-run-edit-file");
runEditorBtn.addEventListener("click", async (e) => {
  await saveEditorFile(true);
  runEditorBtn.blur(); // remove focus
});

$(".act-reboot").addEventListener("click", async (e) => {
  e.preventDefault();
  var confirmed = await Dialog.confirm({
    title: "Reboot Device",
    message: "Are you sure you want to <strong>reboot</strong> the device?",
    confirmText: "Reboot",
    danger: true,
  });
  if (!confirmed) return;
  Dialog.loading.show("Rebooting...");
  try {
    await requestGet("/reboot");
    setTimeout(() => {
      location.reload();
    }, 1000);
  } catch (err) {
    Toast.error("Could not reboot the device. It may be disconnected.");
    Dialog.loading.hide();
  }
});

/* ---- NEW: Standalone Logout button with redirect to login ---- */
var logoutBtn = document.getElementById("btn-logout");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async function (e) {
    e.preventDefault();
    var confirmed = await Dialog.confirm({
      title: "Log Out",
      message:
        "Are you sure you want to <strong>log out</strong> of the WebUI?",
      confirmText: "Log Out",
      danger: true,
    });
    if (!confirmed) return;
    Dialog.loading.show("Logging out...");
    try {
      await requestGet("/logout");
    } catch (x) {
      /* ignore */
    }
    window.location.href = "/";
  });
}

$(".navigator-canvas").addEventListener("click", async (e) => {
  let nav = e.target.matches(".nav") ? e.target : e.target.closest(".nav");
  if (nav === null) return;

  let direction = nav.getAttribute("data-direction");
  if (direction === "Menu") {
    direction = "Sel 500";
  }

  await runNavigation(direction.toLowerCase());
});

window.addEventListener("keydown", async (e) => {
  let key = e.key.toLowerCase();
  if ($(".dialog.editor:not(.hidden)")) {
    // means editor tab is open
    if ((e.ctrlKey || e.metaKey) && key === "s") {
      e.preventDefault();
      e.stopImmediatePropagation();

      await saveEditorFile();
    } else if (e.altKey && key === "enter") {
      e.preventDefault();
      e.stopImmediatePropagation();

      await saveEditorFile(true);
    }
  }

  if ($(".dialog.navigator:not(.hidden)")) {
    const map_navigator = {
      arrowup: "Up",
      arrowdown: "Down",
      arrowleft: "Prev",
      arrowright: "Next",
      enter: "Sel",
      backspace: "Esc",
      m: "Menu",
      pageup: "NextPage",
      pagedown: "PrevPage",
    };

    if (key === "r") {
      e.preventDefault();
      e.stopImmediatePropagation();
      reloadScreen();
      return;
    }

    if (key in map_navigator) {
      e.preventDefault();
      e.stopImmediatePropagation();
      $(
        `.navigator-canvas .nav[data-direction="${map_navigator[key]}"]`,
      ).click();
      return;
    }
  }

  if (key === "escape" && $(".dialog-background:not(.hidden)")) {
    if ($(".dialog.editor:not(.hidden)")) {
      let editor = $(".dialog.editor .file-content");
      if (isModified(editor)) {
        var ok = await Dialog.confirm({
          title: "Unsaved Changes",
          message: "You have unsaved changes. Discard them?",
          confirmText: "Discard",
          danger: false,
        });
        if (!ok) return;
      }
    }

    let btnEscape = $(".dialog:not(.hidden) .act-escape");
    if (btnEscape) btnEscape.click();
    return;
  }
});

$(".file-content").addEventListener("keyup", function (e) {
  if ($(".dialog.editor:not(.hidden)")) {
    // map special characters to their closing pair
    const map_chars = {
      "(": ")",
      "{": "}",
      "[": "]",
      '"': '"',
      "'": "'",
      "`": "`",
      "<": ">",
    };

    // if the key pressed is a special character, insert the closing pair
    if (e.key in map_chars) {
      var cursorPos = this.selectionStart;
      var textBefore = this.value.substring(0, cursorPos);
      var textAfter = this.value.substring(cursorPos);
      this.value = textBefore + map_chars[e.key] + textAfter;
      this.selectionStart = cursorPos;
      this.selectionEnd = cursorPos;
    }

    $(".act-save-edit-file").disabled = !isModified(e.target);
  }
});

/* ---- NEW: Dropzone overlay ---- */
var dropzone = document.getElementById("dropzone");
if (dropzone) {
  window.addEventListener("dragenter", function () {
    dropzone.classList.remove("hidden");
  });
  dropzone.addEventListener("dragleave", function () {
    dropzone.classList.add("hidden");
  });
  dropzone.addEventListener("dragover", function (e) {
    e.preventDefault();
  });
  dropzone.addEventListener("drop", async function (e) {
    e.preventDefault();
    dropzone.classList.add("hidden");
    var items = e.dataTransfer.items;
    if (!items || items.length === 0) return;
    for (var i = 0; i < items.length; i++) {
      var entry = items[i].webkitGetAsEntry();
      if (entry) await appendDroppedFiles(entry);
    }
    if (!_runningUpload)
      setTimeout(function () {
        if (_queueUpload.length > 0) uploadFile();
      }, 100);
  });
}

/* ---- NEW: Client-side search/filter ---- */
var searchInput = document.getElementById("search-input");
var _searchTimer;
if (searchInput) {
  searchInput.addEventListener("input", function () {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(function () {
      var q = searchInput.value.toLowerCase().trim();
      var rows = document.querySelectorAll(
        "#file-tbody .file-row, #file-tbody .path-row",
      );
      rows.forEach(function (row) {
        if (!q) {
          row.style.display = "";
          return;
        }
        if (row.classList.contains("path-row")) {
          row.style.display = q ? "none" : "";
          return;
        }
        var name = (row.querySelector(".col-name") || {}).textContent || "";
        row.style.display = name.toLowerCase().indexOf(q) !== -1 ? "" : "none";
      });
    }, 200);
  });
}

/* ---- NEW: Multi-select with batch actions ---- */
var _selectedFiles = {};
var batchBar = document.getElementById("batch-bar");
var batchCount = document.getElementById("batch-count");
var batchDelete = document.getElementById("batch-delete");
var batchDeselect = document.getElementById("batch-deselect");
var selectAll = document.getElementById("select-all");

function updateBatchBar() {
  var count = Object.keys(_selectedFiles).length;
  if (count > 0) {
    batchBar.classList.remove("hidden");
    batchCount.textContent = count + " selected";
  } else {
    batchBar.classList.add("hidden");
    if (selectAll) selectAll.checked = false;
  }
}

document.addEventListener("change", function (e) {
  var cb = e.target.closest(".file-checkbox");
  if (!cb) return;
  var row = cb.closest(".file-row");
  if (!row) return;
  var path =
    cb.dataset.path ||
    row.getAttribute("data-file") ||
    row.getAttribute("data-path");
  if (!path) return;
  if (cb.checked) {
    _selectedFiles[path] = true;
    row.classList.add("selected");
  } else {
    delete _selectedFiles[path];
    row.classList.remove("selected");
  }
  updateBatchBar();
});

if (selectAll) {
  selectAll.addEventListener("change", function () {
    var checked = this.checked;
    _selectedFiles = {};
    document.querySelectorAll("#file-tbody .file-row").forEach(function (row) {
      var cb = row.querySelector(".file-checkbox");
      var path = row.getAttribute("data-file") || row.getAttribute("data-path");
      if (!cb || !path) return;
      cb.checked = checked;
      if (checked) {
        _selectedFiles[path] = true;
        row.classList.add("selected");
      } else {
        row.classList.remove("selected");
      }
    });
    updateBatchBar();
  });
}

if (batchDeselect) {
  batchDeselect.addEventListener("click", function () {
    _selectedFiles = {};
    document
      .querySelectorAll("#file-tbody .file-row .file-checkbox")
      .forEach(function (cb) {
        cb.checked = false;
        cb.closest(".file-row").classList.remove("selected");
      });
    updateBatchBar();
  });
}

if (batchDelete) {
  batchDelete.addEventListener("click", async function () {
    var paths = Object.keys(_selectedFiles);
    if (paths.length === 0) return;
    var confirmed = await Dialog.confirm({
      title: "Batch Delete",
      message:
        "Delete <strong>" +
        paths.length +
        "</strong> selected file(s)?<br><br>This <strong>cannot be undone</strong>.",
      confirmText: "Delete All",
      danger: true,
    });
    if (!confirmed) return;
    Dialog.loading.show("Deleting " + paths.length + " files...");
    var errors = 0;
    for (var i = 0; i < paths.length; i++) {
      try {
        await requestGet("/file", {
          fs: currentDrive,
          action: "delete",
          name: paths[i],
        });
      } catch (e) {
        errors++;
      }
    }
    Dialog.loading.hide();
    if (errors === 0) Toast.success("Deleted " + paths.length + " files");
    else Toast.error(errors + " file(s) failed to delete");
    _selectedFiles = {};
    fetchSystemInfo();
    fetchFiles(currentDrive, currentPath);
  });
}

/* ---- NEW: Render file list in chunks (non-blocking for large dirs) ---- */
var _renderChunkSize = 50;
function renderFileRowChunked(fileList, doneCallback) {
  var tbody = $("table.explorer tbody");
  tbody.innerHTML = "";
  _selectedFiles = {};
  updateBatchBar();

  var lines = fileList.split("\n").filter(function (l) {
    return l.trim();
  });
  lines.sort(function (a, b) {
    var aT = a.split(":")[0],
      bT = b.split(":")[0];
    if (aT !== bT) return bT.localeCompare(aT);
    return a
      .substring(a.indexOf(":") + 1)
      .toLowerCase()
      .localeCompare(b.substring(b.indexOf(":") + 1).toLowerCase());
  });

  var idx = 0;
  var tmpl = _TMPL;

  function renderNext() {
    var end = Math.min(idx + _renderChunkSize, lines.length);
    var fragment = document.createDocumentFragment();

    for (; idx < end; idx++) {
      var line = lines[idx];
      var parts = line.split(":");
      var type = parts[0];
      if (parts.length < 3) continue;
      var size = parts.pop();
      var name = parts.slice(1).join(":");
      var dPath = (
        (currentPath.endsWith("/") ? currentPath : currentPath + "/") + name
      ).replace(/\/\//g, "/");

      if (type === "pa") {
        if (dPath === "/") continue;
        var er = tmpl.content.querySelector(".path-row").cloneNode(true);
        var preF =
          currentPath.substring(0, currentPath.lastIndexOf("/")) || "/";
        er.setAttribute("data-path", preF);
        er.querySelector("td").classList.add("act-browse");
        fragment.appendChild(er);
      } else if (type === "Fi" || type === "Fo") {
        var er2 = tmpl.content.querySelector(".file-row").cloneNode(true);
        er2.querySelector(".file-checkbox").dataset.path = dPath;
        if (type === "Fo") {
          er2.querySelector(".col-name").classList.add("act-browse");
          er2.setAttribute("data-path", dPath);
          er2.querySelector(".col-action").classList.add("type-folder");
          er2
            .querySelector(".act-rename")
            .setAttribute("data-action", "renameFolder");
        } else {
          er2.setAttribute("data-file", dPath);
          er2
            .querySelector(".act-rename")
            .setAttribute("data-action", "renameFile");
          er2.querySelector(".col-name").classList.add("act-edit-file");
          er2.querySelector(".col-action").classList.add("type-file");
          var dlUrl =
            "/file?fs=" +
            currentDrive +
            "&name=" +
            encodeURIComponent(dPath) +
            "&action=download";
          if (IS_DEV) dlUrl = "/bruce" + dlUrl;
          er2.querySelector(".act-download").setAttribute("download", name);
          er2.querySelector(".act-download").setAttribute("href", dlUrl);
          var sc = getSerialCommand(name);
          if (sc) {
            er2
              .querySelector(".act-play")
              .setAttribute("data-cmd", sc + " " + dPath);
            er2.querySelector(".col-action").classList.add("executable");
          }
          er2.querySelector(".col-size").textContent = size;
        }
        er2.querySelector(".col-name").textContent = name;
        er2.querySelector(".col-name").setAttribute("title", name);
        fragment.appendChild(er2);
      }
    }

    tbody.appendChild(fragment);

    if (idx < lines.length) {
      setTimeout(renderNext, 0);
    } else if (doneCallback) {
      doneCallback();
    }
  }

  if (lines.length === 0) {
    if (doneCallback) doneCallback();
    return;
  }
  renderNext();
}

/* ---- NEW: Override renderFileRow to use chunked version ---- */
renderFileRow = function (fileList) {
  renderFileRowChunked(fileList, function () {
    // restore select-all state after re-render
    if (searchInput) searchInput.value = "";
  });
};

/* ---- Upload file ---- */
uploadFile = function () {
  if (_queueUpload.length === 0) {
    _runningUpload = false;
    $(".dialog.upload .dialog-body").innerHTML = "";
    fetchSystemInfo();
    fetchFiles(currentDrive, currentPath);
    Dialog.hide();
    return;
  }
  return new Promise(function (resolve, reject) {
    _runningUpload = true;
    var file = _queueUpload.shift();
    var filename = file.webkitRelativePath || file.name;
    var fileId = stringToId(filename);

    function onDone(err) {
      uploadFile();
      if (err) reject(err);
      else resolve();
    }

    var fd = new FormData();
    fd.append("file", file, filename);
    fd.append("folder", currentPath);
    fd.append("fs", currentDrive);
    var realUrl = "/upload";
    if (IS_DEV) realUrl = "/bruce" + realUrl;
    var req = new XMLHttpRequest();
    req.upload.onprogress = function (e) {
      if (e.lengthComputable) {
        var pct = Math.round((e.loaded / e.total) * 100);
        var progressEl = document.getElementById(fileId);
        if (progressEl) progressEl.style.width = pct + "%";
      }
    };
    req.onload = function () {
      if (req.status >= 200 && req.status < 300) onDone(null);
      else onDone(new Error("Upload failed"));
    };
    req.onabort = function () {
      onDone(new Error("Aborted"));
    };
    req.onerror = function () {
      onDone(new Error("Network error"));
    };
    req.open("POST", realUrl, true);
    req.send(fd);
  });
};

/* ---- Login event listeners ---- */
document.getElementById("login-btn").addEventListener("click", function () {
  this.disabled = true;
  this.textContent = "Logging in...";
  document.getElementById("login-error").classList.add("hidden");
  loginAuthenticate(
    document.getElementById("login-username").value.trim(),
    document.getElementById("login-password").value,
  );
});

document
  .getElementById("login-password")
  .addEventListener("keydown", function (e) {
    if (e.key === "Enter") document.getElementById("login-btn").click();
  });

document
  .getElementById("login-username")
  .addEventListener("keydown", function (e) {
    if (e.key === "Enter") document.getElementById("login-password").focus();
  });

document
  .getElementById("password-toggle")
  .addEventListener("click", function () {
    var pw = document.getElementById("login-password");
    this.classList.toggle("visible");
    pw.type = pw.type === "password" ? "text" : "password";
    this.title = pw.type === "password" ? "Show password" : "Hide password";
  });

/* ---- Serial Dialog event listeners ---- */
document
  .getElementById("serial-input")
  .addEventListener("input", function () {
    var inp = document.getElementById("serial-input");
    if (inp) SerialDialog._buildList(inp.value);
  });

document
  .getElementById("serial-input")
  .addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      SerialDialog.send();
    }
  });

document.getElementById("serial-send").addEventListener("click", function () {
  SerialDialog.send();
});

async function startApp() {
  Dialog.loading.hide();
  await Promise.all([fetchSystemInfo(), fetchFiles("LittleFS", "/")]);
  setTimeout(function () {
    ThemeCache.updateDot();
  }, 50);
}

/* ---- Init ---- */
ThemeCache.init();
(async function () {
  if (IS_DEV) {
    loginHide();
    await startApp();
    return;
  }
  /* Check if already authenticated (cookie present and valid) */
  var s = await loginTest();
  if (s >= 200 && s < 400) {
    loginHide();
    await startApp();
    return;
  }
  /* Show login form */
  loginShow();
})();
