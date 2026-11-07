/*
 * MomsBloom Resource Directory embed. Put this in a Squarespace code block on momsbloom.org/resources:
 *
 *   <script src="https://resources.momsbloom.org/embed.js" async></script>
 *
 * What it does:
 * 1. It makes an iframe that shows https://resources.momsbloom.org/embed, just after this <script> tag.
 * 2. It listens for "resize" messages from that iframe and sets the iframe height to match, so the
 *    page has no second scroll bar.
 * 3. It listens for "scroll" messages: the iframe asks the page to scroll to a point in the iframe,
 *    but only when that point is out of view.
 * 4. It listens for "location" messages, so that a link copied from the browser bar shows the same
 *    results (ADR 0005). The iframe sends its filters (never `near` or `n`; custom field filters are
 *    `cf<id>`) and the open Program.
 *    With one Embed on the page, they go into the page URL with the prefix "mbr-" (mbr-q=yoga,
 *    mbr-program=P-101), so they never clash with Squarespace's own keys (Squarespace uses ?q=).
 *    On load, the mbr- keys in the page URL go into the iframe URL. Other page keys are never read
 *    or changed. The page URL changes with replaceState, so the Back button does not step through
 *    each filter.
 * 5. It listens for "event" messages (ADR 0006). If the page has its own gtag() (Squarespace GA4),
 *    a valid event from the allow-list below goes to gtag("event", name, params). With no gtag, the
 *    event is dropped. This file never loads Google code and never sets a cookie.
 *
 * This file is plain JavaScript (no TypeScript, no build step) because the browser loads it directly
 * from Squarespace. The message names and checks are a copy of src/embed/protocol.ts.
 * Safety: we accept a message only if it comes from our own iframe, and we check every value.
 */
(function () {
  "use strict";

  var RESIZE = "momsbloom-resources:resize";
  var SCROLL = "momsbloom-resources:scroll";
  var LOCATION = "momsbloom-resources:location";
  var EVENT = "momsbloom-resources:event";
  // The event names and the parameter keys that may pass (a copy of ANALYTICS_EVENTS in protocol.ts).
  var EVENTS = {"directory_search":["search_term","result_count"],"directory_zero_results":["search_term","filters"],"directory_filter":["filter_group","filter_value"],"program_view":["program_id"],"program_call":["program_id"],"program_directions":["program_id"],"program_website":["program_id"],"document_download":["document_id"]};
  // A copy of REDACT_STRIP in protocol.ts: ignored before digits are counted in a keyword.
  var REDACT_STRIP = /[\s().\/_-]/g;
  var MAX_HEIGHT = 50000;
  var MAX_SEARCH = 2000;
  var MAX_VALUE = 100;
  var KEYS = ["q", "cat", "sub", "ins", "cost", "lang", "who", "fmt", "org", "sort", "view"];
  // Custom field filters (cf12=1): a copy of HOST_CUSTOM_KEY in protocol.ts.
  var CUSTOM_KEY = /^cf\d{1,9}$/;
  var MAX_CUSTOM_KEYS = 20;
  var HOST_PREFIX = "mbr-";
  var PROGRAM_KEY = HOST_PREFIX + "program";
  var PROGRAM_ID = /^[A-Za-z0-9-]{1,40}$/;
  var MOUNTED = "data-momsbloom-mounted";

  /** The gtag params from a message: allow-listed keys only, or null when anything is wrong. */
  function eventParams(name, raw) {
    if (!Object.prototype.hasOwnProperty.call(EVENTS, name)) return null;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    var out = {};
    var keys = Object.keys(raw);
    for (var i = 0; i < keys.length; i++) {
      var value = raw[keys[i]];
      if (EVENTS[name].indexOf(keys[i]) < 0) return null;
      // Defense in depth (the iframe does this too): a keyword with @ or 5+ digits is redacted, an ID must look like an ID.
      if (keys[i] === "search_term" && typeof value === "string" && (value.indexOf("@") >= 0 || /\d{5}/.test(value.replace(REDACT_STRIP, "")))) value = "(redacted)";
      if ((keys[i] === "program_id" || keys[i] === "document_id") && !(typeof value === "string" && PROGRAM_ID.test(value))) return null;
      var ok = typeof value === "string" ? value.length <= MAX_VALUE : typeof value === "number" && isFinite(value) && value >= 0;
      if (!ok) return null;
      out[keys[i]] = value;
    }
    return out;
  }

  function isEmbedScript(script) {
    try {
      return /\/embed\.js$/.test(new URL(script.src, window.location.href).pathname);
    } catch {
      return false;
    }
  }

  /**
   * The <script> tags to turn into iframes. Normally that is this script (document.currentScript).
   * Some Squarespace templates load pages with AJAX and run the code block again; then currentScript
   * can be empty, so we find each embed script that does not have an iframe yet.
   */
  function scriptsToMount() {
    var current = document.currentScript;
    if (current && !current.hasAttribute(MOUNTED)) return [current];
    var all = document.querySelectorAll("script[src]");
    var list = [];
    for (var i = 0; i < all.length; i++) {
      if (!all[i].hasAttribute(MOUNTED) && isEmbedScript(all[i])) list.push(all[i]);
    }
    return list;
  }

  /** The custom filter keys (without the prefix) found in params, at most MAX_CUSTOM_KEYS. */
  function customKeys(params, prefix) {
    var keys = [];
    params.forEach(function (_value, name) {
      if (name.indexOf(prefix) !== 0) return;
      var key = name.slice(prefix.length);
      if (CUSTOM_KEY.test(key) && keys.indexOf(key) < 0 && keys.length < MAX_CUSTOM_KEYS) keys.push(key);
    });
    return keys;
  }

  /** Only the filter keys, in a new URLSearchParams. */
  function filterParams(params, prefix) {
    var out = new URLSearchParams();
    KEYS.concat(customKeys(params, prefix)).forEach(function (key) {
      params.getAll(prefix + key).forEach(function (value) {
        if (value.length > MAX_VALUE) return; // the server ignores long values; keep the URL short
        out.append(key, value);
      });
    });
    return out;
  }

  /** Writes the filters and the Program into the page URL. Never touches keys without our prefix. */
  function writeHostUrl(search, program) {
    var url = new URL(window.location.href);
    KEYS.concat(customKeys(url.searchParams, HOST_PREFIX)).forEach(function (key) {
      url.searchParams.delete(HOST_PREFIX + key);
    });
    url.searchParams.delete(PROGRAM_KEY);
    // Old links may hold keys that we no longer share. Remove them (the ZIP code must not stay in the URL).
    ["zip", "near", "n", "r"].forEach(function (key) {
      url.searchParams.delete(HOST_PREFIX + key);
    });
    filterParams(new URLSearchParams(search), "").forEach(function (value, key) {
      url.searchParams.append(HOST_PREFIX + key, value);
    });
    if (program) url.searchParams.set(PROGRAM_KEY, program);
    // Commas need no encoding in a query string, and mbr-r=10 reads better than any escape.
    url.search = url.searchParams.toString().replace(/%2C/gi, ",");
    if (url.href !== window.location.href) {
      window.history.replaceState(window.history.state, "", url.href);
    }
  }

  function mount(script) {
    script.setAttribute(MOUNTED, "");
    // The iframe comes from the same site as this script (production, a Vercel preview, or localhost).
    var origin = new URL(script.src, window.location.href).origin;

    var iframe = document.createElement("iframe");
    var hostParams = new URLSearchParams(window.location.search);
    var query = filterParams(hostParams, HOST_PREFIX).toString();
    var program = hostParams.get(PROGRAM_KEY);
    var path = program && PROGRAM_ID.test(program) ? "/embed/programs/" + encodeURIComponent(program) : "/embed";
    iframe.src = origin + path + (query ? "?" + query : "");
    iframe.title = "MomsBloom Resource Directory";
    iframe.setAttribute("data-momsbloom-embed", "");
    // "Use my location" needs this: a cross-origin iframe may not ask for the location without it.
    iframe.allow = "geolocation";
    // sandbox: the iframe may run scripts and open links in new tabs, and nothing more.
    iframe.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms",
    );
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    iframe.style.width = "100%";
    iframe.style.height = "600px"; // start height until the first resize message arrives
    iframe.style.border = "0";
    iframe.style.display = "block";
    script.parentNode.insertBefore(iframe, script.nextSibling);

    var loads = 0;
    window.addEventListener("message", function (event) {
      if (event.origin !== origin || event.source !== iframe.contentWindow) return;
      var data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === RESIZE) {
        var height = data.height;
        if (typeof height !== "number" || !isFinite(height) || height < 0 || height > MAX_HEIGHT) return;
        iframe.style.height = Math.ceil(height) + "px";
      } else if (data.type === SCROLL) {
        var top = data.top;
        if (typeof top !== "number" || !isFinite(top) || top < 0 || top > MAX_HEIGHT) return;
        var y = iframe.getBoundingClientRect().top + top;
        if (y < 0 || y > window.innerHeight) window.scrollBy(0, y);
      } else if (data.type === EVENT) {
        var params = typeof data.name === "string" ? eventParams(data.name, data.params) : null;
        if (!params || typeof window.gtag !== "function") return;
        try {
          window.gtag("event", data.name, params);
        } catch {} // the page's own analytics must never break the Directory
      } else if (data.type === LOCATION) {
        if (typeof data.search !== "string" || data.search.length > MAX_SEARCH) return;
        if (data.program !== null && !(typeof data.program === "string" && PROGRAM_ID.test(data.program))) return;
        loads += 1;
        // The first load is the start state: the page URL stays as it is.
        if (loads === 1) return;
        // With more than one Embed on the page, the URL cannot hold both: no sync.
        if (document.querySelectorAll("iframe[data-momsbloom-embed]").length === 1) writeHostUrl(data.search, data.program);
      }
    });
  }

  scriptsToMount().forEach(mount);
})();
