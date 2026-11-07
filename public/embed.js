/*
 * MomsBloom Resource Directory embed. Put this in a Squarespace code block on momsbloom.org/resources:
 *
 *   <script src="https://resources.momsbloom.org/embed.js" async></script>
 *
 * What it does:
 * 1. It makes an iframe that shows https://resources.momsbloom.org/embed, just after this <script> tag.
 * 2. It listens for "resize" messages from that iframe and sets the iframe height to match, so the
 *    page has no second scroll bar.
 *
 * This file is plain JavaScript (no TypeScript, no build step) because the browser loads it directly
 * from Squarespace. The message names and checks are a copy of src/embed/protocol.ts.
 * Safety: we accept a message only if it comes from our own iframe, and we check every value.
 */
(function () {
  "use strict";

  var RESIZE = "momsbloom-resources:resize";
  var MAX_HEIGHT = 50000;
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

  function mount(script) {
    script.setAttribute(MOUNTED, "");
    // The iframe comes from the same site as this script (production, a Vercel preview, or localhost).
    var origin = new URL(script.src, window.location.href).origin;

    var iframe = document.createElement("iframe");
    iframe.src = origin + "/embed";
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

    window.addEventListener("message", function (event) {
      if (event.origin !== origin || event.source !== iframe.contentWindow) return;
      var data = event.data;
      if (!data || typeof data !== "object" || data.type !== RESIZE) return;
      var height = data.height;
      if (typeof height !== "number" || !isFinite(height) || height < 0 || height > MAX_HEIGHT) return;
      iframe.style.height = Math.ceil(height) + "px";
    });
  }

  scriptsToMount().forEach(mount);
})();
