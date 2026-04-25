(function () {
    "use strict";

    const PERFORMANCE_OBSERVER = {
        start: performance.now(),
        metrics: {}
    };

    function recordMetric(name) {
        PERFORMANCE_OBSERVER.metrics[name] = performance.now() - PERFORMANCE_OBSERVER.start;
    }

    function applyStoredTheme() {
        const stored = localStorage.getItem("theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const theme = stored || (prefersDark ? "dark" : "light");
        document.body.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
        recordMetric("themeApplied");
    }

    function initThemeToggle() {
        document.querySelectorAll(".theme-toggle").forEach(function (btn) {
            btn.addEventListener("click", function (e) {
                e.stopImmediatePropagation();
                const current = document.body.getAttribute("data-theme") || "light";
                const next = current === "light" ? "dark" : "light";
                document.body.setAttribute("data-theme", next);
                localStorage.setItem("theme", next);
            }, true);
        });
    }

    function createSearchIndex() {
        const index = {};
        const contentElements = document.querySelectorAll("h1, h2, h3, p, dt, article[role='main'] dl");

        contentElements.forEach((el, idx) => {
            const text = el.textContent.toLowerCase();
            const words = text.split(/\s+/).filter(w => w.length > 2);
            const id = el.id || `content-${idx}`;

            words.forEach(word => {
                if (!index[word]) {
                    index[word] = [];
                }
                if (!index[word].find(item => item.id === id)) {
                    index[word].push({
                        id,
                        text: el.textContent.substring(0, 100),
                        element: el,
                        type: el.tagName.toLowerCase(),
                        relevance: el.tagName === "H1" ? 10 : el.tagName === "H2" ? 7 : 5
                    });
                }
            });
        });

        return index;
    }

    function fuzzySearch(query, index) {
        if (!query || query.length < 2) return [];

        const results = [];
        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const seen = new Set();

        queryWords.forEach(word => {
            Object.keys(index).forEach(indexWord => {
                if (indexWord.includes(word) || word.includes(indexWord.substring(0, 3))) {
                    index[indexWord].forEach(item => {
                        if (!seen.has(item.id)) {
                            results.push({
                                ...item,
                                score: word === indexWord ? item.relevance * 2 : item.relevance
                            });
                            seen.add(item.id);
                        }
                    });
                }
            });
        });

        return results.sort((a, b) => b.score - a.score).slice(0, 8);
    }

    let searchIndex = null;

    function initGlobalSearch() {
        const searchInput = document.getElementById("globalSearch") || 
                           document.querySelector(".search-input");
        const searchResults = document.getElementById("searchResults") || 
                             document.querySelector(".search-results-dropdown");

        if (!searchInput) return;

        if (!searchIndex) {
            searchIndex = createSearchIndex();
        }

        searchInput.addEventListener("input", function (e) {
            const query = e.target.value;

            if (searchResults) {
                if (query.length < 2) {
                    searchResults.innerHTML = "";
                    searchResults.style.display = "none";
                    return;
                }

                const results = fuzzySearch(query, searchIndex);

                if (results.length === 0) {
                    searchResults.innerHTML = '<div style="padding: 12px; text-align: center; color: #999;">No results found</div>';
                } else {
                    searchResults.innerHTML = results.map((result, idx) => `
                        <div class="search-result-item" style="padding: 12px; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s;" onclick="document.getElementById('globalSearch').value = ''; this.closest('.search-results-dropdown').style.display = 'none'; document.querySelector('[id=\\"${result.id}\\"]')?.scrollIntoView({behavior: 'smooth', block: 'start'});">
                            <div style="font-weight: 600; font-size: 0.9em; color: #E04000;">${result.type.toUpperCase()}</div>
                            <div style="margin-top: 4px; font-size: 0.85em; color: #666;">${result.text}...</div>
                        </div>
                    `).join("");
                }

                searchResults.style.display = "block";
            }
        });

        document.addEventListener("click", function (e) {
            if (searchResults && !searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = "none";
            }
        });

        searchInput.addEventListener("focus", function () {
            if (this.value.length > 1 && searchResults) {
                searchResults.style.display = "block";
            }
        });
    }

    function fetchGitHubCounters() {
        const starsCountEl = document.getElementById("ire-stars-count");
        const usedByCountEl = document.getElementById("ire-usedby-count");

        if (!starsCountEl && !usedByCountEl) return;

        const cacheKey = "ire-github-cache";
        const cacheTime = localStorage.getItem(`${cacheKey}-time`);
        const now = Date.now();

        if (cacheTime && now - parseInt(cacheTime) < 3600000) {
            const cached = JSON.parse(localStorage.getItem(cacheKey));
            if (cached && starsCountEl) {
                starsCountEl.textContent = cached.stars;
            }
            if (cached && usedByCountEl) {
                usedByCountEl.textContent = cached.used;
            }
            recordMetric("githubCountersCached");
            return;
        }

        fetch("https://api.github.com/repos/abirxdhack/irenogram", {
            headers: { "Accept": "application/vnd.github.v3+json" }
        })
            .then(function (r) {
                if (!r.ok) throw new Error("rate limited");
                return r.json();
            })
            .then(function (data) {
                const starsCount = data.stargazers_count ? data.stargazers_count.toLocaleString() : "—";
                const usedCount = data.network_count ? data.network_count.toLocaleString() : "—";

                if (starsCountEl) starsCountEl.textContent = starsCount;
                if (usedByCountEl) usedByCountEl.textContent = usedCount;

                localStorage.setItem(cacheKey, JSON.stringify({
                    stars: starsCount,
                    used: usedCount
                }));
                localStorage.setItem(`${cacheKey}-time`, now.toString());
                recordMetric("githubCountersFetched");
            })
            .catch(function () {
                if (starsCountEl) starsCountEl.textContent = "—";
                if (usedByCountEl) usedByCountEl.textContent = "—";
            });
    }

    function highlightCurrentNav() {
        const path = window.location.pathname;
        document.querySelectorAll(".sidebar-tree a.reference").forEach(function (link) {
            const href = link.getAttribute("href");
            if (href && path.endsWith(href.replace(/^\.\//, "").replace(/^\.\.\//, ""))) {
                link.style.color = "var(--color-brand-content)";
                link.style.fontWeight = "600";
                const parent = link.closest("li");
                if (parent) {
                    parent.classList.add("current");
                }
            }
        });
        recordMetric("navHighlighted");
    }

    function addCopyFeedback() {
        document.addEventListener("click", function (e) {
            const btn = e.target.closest(".copybtn");
            if (btn) {
                const originalText = btn.innerHTML;
                const originalClass = btn.className;

                btn.innerHTML = "✓ Copied";
                btn.classList.add("copied");

                setTimeout(function () {
                    btn.innerHTML = originalText;
                    btn.className = originalClass;
                }, 2000);

                if (btn.closest(".highlight")) {
                    const codeBlock = btn.closest(".highlight").querySelector("pre");
                    if (codeBlock) {
                        navigator.clipboard.writeText(codeBlock.textContent).catch(() => {});
                    }
                }
            }
        });
    }

    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function (a) {
            a.addEventListener("click", function (e) {
                const target = document.querySelector(this.getAttribute("href"));
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: "smooth", block: "start" });
                    history.pushState(null, null, this.getAttribute("href"));
                }
            });
        });
    }

    function cleanupEnumDocumentation() {
        const article = document.querySelector('article[role="main"]');
        if (!article) return;

        const allParagraphs = article.querySelectorAll('p, dt, dd, div');
        const seen = new Set();
        
        allParagraphs.forEach((el) => {
            if (el.children.length === 0) {
                const text = el.textContent.trim();
                const key = text.substring(0, 50);
                
                if (text.length > 0 && !text.includes('class ') && !text.includes('Bases:')) {
                    if (seen.has(key) && el.tagName !== 'DT') {
                        el.remove();
                    } else if (text.length > 10) {
                        seen.add(key);
                    }
                }
            }
        });

        const dts = article.querySelectorAll('dt');
        dts.forEach(dt => {
            const content = dt.textContent.trim();
            if (content.match(/^[A-Z_]+ = <class 'pyrogram/)) {
                const codeMatch = content.match(/^([A-Z_]+)\s*=/);
                if (codeMatch) {
                    dt.innerHTML = `<code class="descname">${codeMatch[1]}</code>`;
                }
            }
        });
    }

    function improveDefinitionLists() {
        const dls = document.querySelectorAll('article[role="main"] dl');
        dls.forEach(dl => {
            const dts = dl.querySelectorAll('dt');
            const dds = dl.querySelectorAll('dd');
            
            dts.forEach((dt, idx) => {
                const code = dt.querySelector('code');
                if (code) {
                    const name = code.textContent.trim();
                    dt.innerHTML = `<code class="descname">${name}</code>`;
                }
            });
        });
    }

    applyStoredTheme();

    document.addEventListener("DOMContentLoaded", function () {
        initThemeToggle();
        fetchGitHubCounters();
        highlightCurrentNav();
        addCopyFeedback();
        initSmoothScroll();
        initGlobalSearch();
        cleanupEnumDocumentation();
        improveDefinitionLists();
        recordMetric("domReady");
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            recordMetric("contentLoaded");
        });
    }
})();
