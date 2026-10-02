// Base URL of the Altura API (no trailing slash).
// Pages opened from localhost use the local API; every other host uses PRODUCTION_API.
(function () {
  var PRODUCTION_API = "https://altura-6pag.onrender.com";
  var local = ["localhost", "127.0.0.1"].indexOf(location.hostname) !== -1;
  window.ALTURA_API = local ? "http://localhost:3000" : PRODUCTION_API;
})();
