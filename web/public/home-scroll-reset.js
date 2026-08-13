/**
 * Homepage refresh must stay at the hero. Browser scroll restoration and
 * leftover hashes (#contact, #gallery, #events) otherwise land at the bottom.
 */
(function () {
  try {
    var path = location.pathname;
    if (path !== "/" && path !== "") return;

    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    var nav =
      performance.getEntriesByType &&
      performance.getEntriesByType("navigation")[0];
    var isReload = nav
      ? nav.type === "reload"
      : !!(performance.navigation && performance.navigation.type === 1);
    var hash = location.hash || "";
    var stayTop =
      isReload ||
      !hash ||
      hash === "#" ||
      hash === "#home" ||
      hash === "#events" ||
      hash === "#upcoming-home-events";

    if (!stayTop) return;

    if (hash && hash !== "#") {
      history.replaceState(null, "", path + location.search);
    }

    var html = document.documentElement;
    html.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    html.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  } catch (e) {
    /* ignore */
  }
})();
