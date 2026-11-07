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
 *    results (ADR 0005). The iframe sends its filters (never `near` or `n`) and the open Program.
 *    With one Embed on the page, they go into the page URL with the prefix "mbr-" (mbr-q=yoga,
 *    mbr-program=P-101), so they never clash with Squarespace's own keys (Squarespace uses ?q=).
 *    On load, the mbr- keys in the page URL go into the iframe URL. Other page keys are never read
 *    or changed. The page URL changes with replaceState, so the Back button does not step through
 *    each filter.
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
  var MAX_HEIGHT = 50000;
  var MAX_SEARCH = 2000;
  var KEYS = ["q", "zip", "r", "cat", "sub", "ins", "cost", "lang", "who", "fmt", "org", "sort", "view"];
  var HOST_PREFIX = "mbr-";
  var PROGRAM_KEY = HOST_PREFIX + "program";
  var PROGRAM_ID = /^[A-Za-z0-9-]{1,40}$/;
  var MOUNTED = "data-momsbloom-mounted";

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

  /** Only the filter keys, in a new URLSearchParams. */
  function filterParams(params, prefix) {
    var out = new URLSearchParams();
    KEYS.forEach(function (key) {
      params.getAll(prefix + key).forEach(function (value) {
        out.append(key, value);
      });
    });
    return out;
  }

  /** Writes the filters and the Program into the page URL. Never touches keys without our prefix. */
  function writeHostUrl(search, program) {
    var url = new URL(window.location.href);
    KEYS.forEach(function (key) {
      url.searchParams.delete(HOST_PREFIX + key);
    });
    url.searchParams.delete(PROGRAM_KEY);
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
