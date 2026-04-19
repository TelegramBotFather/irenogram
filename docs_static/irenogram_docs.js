(function () {
    "use strict";

    function applyStoredTheme() {
        var stored = localStorage.getItem("theme");
        if (stored === "dark") {
            document.body.setAttribute("data-theme", "dark");
        } else {
            document.body.setAttribute("data-theme", "light");
            localStorage.setItem("theme", "light");
        }
    }

    applyStoredTheme();

    function initThemeToggle() {
        document.querySelectorAll(".theme-toggle").forEach(function (btn) {
            btn.addEventListener("click", function (e) {
                e.stopImmediatePropagation();
                var current = document.body.getAttribute("data-theme") || "light";
                var next = current === "light" ? "dark" : "light";
                document.body.setAttribute("data-theme", next);
                localStorage.setItem("theme", next);
            }, true);
        });
    }

    function fetchGitHubCounters() {
        var starsCountEl = document.getElementById("ire-stars-count");
        var usedByCountEl = document.getElementById("ire-usedby-count");

        if (!starsCountEl && !usedByCountEl) return;

        fetch("https://api.github.com/repos/abirxdhack/irenogram", {
            headers: { "Accept": "application/vnd.github.v3+json" }
        })
            .then(function (r) {
                if (!r.ok) throw new Error("rate limited");
                return r.json();
            })
            .then(function (data) {
                if (starsCountEl && typeof data.stargazers_count === "number") {
                    starsCountEl.textContent = data.stargazers_count.toLocaleString();
                }
                if (usedByCountEl && typeof data.network_count === "number") {
                    usedByCountEl.textContent = data.network_count.toLocaleString();
                } else if (usedByCountEl) {
                    usedByCountEl.textContent = "\u2014";
                }
            })
            .catch(function () {
                if (starsCountEl) starsCountEl.textContent = "\u2014";
                if (usedByCountEl) usedByCountEl.textContent = "\u2014";
            });
    }

    function highlightCurrentNav() {
        var path = window.location.pathname;
        document.querySelectorAll(".sidebar-tree a.reference").forEach(function (link) {
            var href = link.getAttribute("href");
            if (href && path.endsWith(href.replace(/^\.\//, "").replace(/^\.\.\//, ""))) {
                link.style.color = "var(--color-brand-content)";
                link.style.fontWeight = "600";
                var parent = link.closest("li");
                if (parent) parent.classList.add("current");
            }
        });
    }

    function addCopyFeedback() {
        document.addEventListener("click", function (e) {
            var btn = e.target.closest(".copybtn");
            if (btn) {
                var orig = btn.innerHTML;
                btn.innerHTML = "\u2713 Copied";
                setTimeout(function () { btn.innerHTML = orig; }, 2000);
            }
        });
    }

    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function (a) {
            a.addEventListener("click", function (e) {
                var target = document.querySelector(this.getAttribute("href"));
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: "smooth", block: "start" });
                    history.pushState(null, null, this.getAttribute("href"));
                }
            });
        });
    }

    function initBackToTop() {
        var btn = document.querySelector(".back-to-top");
        if (!btn) return;
        window.addEventListener("scroll", function () {
            var visible = window.scrollY > 300;
            btn.style.opacity = visible ? "1" : "0";
            btn.style.pointerEvents = visible ? "auto" : "none";
        });
        btn.addEventListener("click", function (e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        initThemeToggle();
        fetchGitHubCounters();
        highlightCurrentNav();
        addCopyFeedback();
        initSmoothScroll();
        initBackToTop();
    });
})();
