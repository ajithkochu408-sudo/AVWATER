// Live Google rating and reviews for avwater.in.
// Reads /api/reviews (served by src/worker.js) and fills in:
//   - every element with data-gr="rating"  -> e.g. 4.9
//   - every element with data-gr="count"   -> e.g. 113
//   - the reviews grid (#gr-list) with the latest Google reviews
// If Google can't be reached, the numbers already written in the page stay as they are.
(function () {
  fetch("/api/reviews")
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (d) {
      if (typeof d.rating === "number") {
        document.querySelectorAll('[data-gr="rating"]').forEach(function (el) {
          el.textContent = d.rating.toFixed(1);
        });
      }
      if (typeof d.count === "number") {
        document.querySelectorAll('[data-gr="count"]').forEach(function (el) {
          el.textContent = d.count;
        });
      }
      var all = document.getElementById("gr-all");
      if (all && d.mapsUrl) all.href = d.mapsUrl;

      var list = document.getElementById("gr-list");
      var reviews = (d.reviews || []).filter(function (r) { return r.text; });
      if (!list || reviews.length === 0) return;

      list.innerHTML = "";
      reviews.forEach(function (rv) {
        var card = el("div", "review-card visible");

        var n = Math.max(0, Math.min(5, Math.round(rv.rating || 0)));
        card.appendChild(el("div", "review-stars", "⭐".repeat(n)));

        var t = rv.text.length > 260 ? rv.text.slice(0, 260).trim() + "…" : rv.text;
        card.appendChild(el("p", "review-text", "“" + t + "”"));

        var who = el("div", "reviewer");
        who.appendChild(el("div", "reviewer-avatar", (rv.author || "G").charAt(0).toUpperCase()));
        var info = el("div");
        var name = el(rv.authorUrl ? "a" : "div", "reviewer-name", rv.author || "Google user");
        if (rv.authorUrl) {
          name.href = rv.authorUrl;
          name.target = "_blank";
          name.rel = "noopener";
          name.style.textDecoration = "none";
        }
        info.appendChild(name);
        if (rv.when) info.appendChild(el("div", "reviewer-location", rv.when));
        who.appendChild(info);
        card.appendChild(who);

        card.appendChild(el("div", "google-badge", "🔵 Google Review"));
        list.appendChild(card);
      });
    })
    .catch(function () { /* keep the numbers already in the page */ });

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }
})();
