(function () {
  window.addEventListener(
    "beforeinstallprompt",
    function (event) {
      event.preventDefault();
      window.__naijaspaDeferredInstall = event;
      window.dispatchEvent(new Event("naijaspa-can-install"));
    },
    true
  );

  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  });
})();
