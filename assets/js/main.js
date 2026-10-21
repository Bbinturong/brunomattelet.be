/**
 * brn • std — shared interaction script.
 *
 * One file for every page. Every block is guarded by an element check,
 * so it is safe to load on pages that don't contain a given feature.
 * No external dependencies (jQuery has been removed).
 */

/* -------------------------------------------------------------------------- *
 * Color me: the palette is restored before the first paint by the inline
 * script in each page's <head> — this file is deferred, so it runs after
 * parsing and would repaint the page a second time. The restore below is
 * only a backstop for that inline script; the toggle itself lives further
 * down, in the DOMContentLoaded block.
 * -------------------------------------------------------------------------- */
const COLOR_ME_STORAGE = "colorMePalette";
const COLOR_ME_ACTIVE = "colorMeActive";
const COLOR_ME_VARS = ["--bg", "--ink", "--muted", "--soft", "--accent"];

const applyPalette = (palette) => {
    COLOR_ME_VARS.forEach((name) => {
        if (palette[name]) {
            document.documentElement.style.setProperty(name, palette[name]);
        }
    });
};

const clearPalette = () => {
    COLOR_ME_VARS.forEach((name) =>
        document.documentElement.style.removeProperty(name)
    );
    // Nothing else to clear: <html> deliberately has no background of its
    // own, so that <body> keeps propagating its own to the canvas and the
    // decorative .squared frame (z-index -99999) stays visible.
};

try {
    if (localStorage.getItem(COLOR_ME_ACTIVE) === "1") {
        const saved = JSON.parse(localStorage.getItem(COLOR_ME_STORAGE));
        if (saved) applyPalette(saved);
    }
} catch {
    /* corrupt storage — ignore, default theme applies */
}

/**
 * Generate a random palette that is harmonious (hues picked from classic
 * color-theory schemes around a random base hue) and accessible (lightness
 * of each role is solved against WCAG contrast targets on the background):
 *   --ink    >= 7:1  (AAA, body text & borders)
 *   --muted  >= 4.5:1 (AA, secondary text)
 *   --accent >= 4.5:1 (AA, small flourish text)
 *   --soft   >= 2:1  (decorative strokes only)
 */
const generatePalette = () => {
    const rand = (min, max) => min + Math.random() * (max - min);
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const hslToRgb = (h, s, l) => {
        const k = (n) => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = (n) =>
            l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return {
            r: Math.round(f(0) * 255),
            g: Math.round(f(8) * 255),
            b: Math.round(f(4) * 255),
        };
    };

    // WCAG 2.x relative luminance and contrast ratio
    const luminance = ({ r, g, b }) => {
        const lin = (v) => {
            v /= 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    const contrast = (a, b) => {
        const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
        return (hi + 0.05) / (lo + 0.05);
    };

    // Find the lightness closest to the background that still meets the
    // contrast target (luminance is monotonic in HSL lightness, so binary
    // search works). Falls back to pure black/white when unreachable.
    const fitLightness = (hue, sat, bg, target, darkerThanBg) => {
        let lo = 0;
        let hi = 1;
        for (let i = 0; i < 24; i++) {
            const mid = (lo + hi) / 2;
            const ok = contrast(hslToRgb(hue, sat, mid), bg) >= target;
            if (darkerThanBg) {
                if (ok) lo = mid;
                else hi = mid;
            } else if (ok) {
                hi = mid;
            } else {
                lo = mid;
            }
        }
        // Nudge past the threshold so integer rounding can't dip below it.
        return darkerThanBg ? Math.max(0, lo - 0.02) : Math.min(1, hi + 0.02);
    };

    const baseHue = rand(0, 360);
    // Classic harmony schemes: complementary, split-complementary, triadic,
    // analogous, and near-analogous accents.
    const harmony = pick([
        [180],
        [150, 210],
        [120, 240],
        [30, 330],
        [60, 300],
    ]);
    const hueAt = (offset) => (baseHue + offset) % 360;

    const dark = Math.random() < 0.35; // sometimes go dark-mode
    const bg = hslToRgb(baseHue, rand(0.15, 0.5), dark ? rand(0.07, 0.13) : rand(0.92, 0.97));

    const inkHue = hueAt(pick(harmony));
    const inkSat = rand(0.25, 0.75);
    const accentHue = hueAt(pick(harmony));
    const accentSat = rand(0.5, 0.9);

    const solve = (hue, sat, target) =>
        hslToRgb(hue, sat, fitLightness(hue, sat, bg, target, !dark));

    const toCss = ({ r, g, b }) => `rgb(${r}, ${g}, ${b})`;
    return {
        "--bg": toCss(bg),
        "--ink": toCss(solve(inkHue, inkSat, 7)),
        "--muted": toCss(solve(inkHue, inkSat * 0.6, 4.5)),
        "--soft": toCss(solve(inkHue, inkSat * 0.5, 2)),
        "--accent": toCss(solve(accentHue, accentSat, 4.5)),
    };
};

document.addEventListener("DOMContentLoaded", () => {
    const LOCAL_IMAGE_COUNT = 36;
    const CYCLE_INTERVAL_MS = 80;

    /* ---------------------------------------------------------------------- *
     * Color me (all pages): toggles between a colored version and the
     * default black & white one. Every switch to colored generates a brand
     * new palette; the stored one only keeps the theme consistent across
     * pages while the switch is on.
     * ---------------------------------------------------------------------- */
    const colorMeBtn = document.querySelector(".color-me");
    if (colorMeBtn) {
        const isActive = () => localStorage.getItem(COLOR_ME_ACTIVE) === "1";

        const setState = (active) => {
            localStorage.setItem(COLOR_ME_ACTIVE, active ? "1" : "0");
            colorMeBtn.setAttribute("aria-checked", String(active));
        };
        setState(isActive()); // sync the switch with the restored state

        colorMeBtn.addEventListener("click", () => {
            if (isActive()) {
                clearPalette();
                setState(false);
                return;
            }
            const palette = generatePalette(); // always a fresh palette
            localStorage.setItem(COLOR_ME_STORAGE, JSON.stringify(palette));
            applyPalette(palette);
            setState(true);
        });
    }

    /** Random 1..max, never repeating the previous pick. */
    const randomIndex = (max, previous) => {
        let index;
        do {
            index = Math.floor(Math.random() * max) + 1;
        } while (index === previous && max > 1);
        return index;
    };

    /* ---------------------------------------------------------------------- *
     * Hover image cycle (home + work pages)
     *
     * Each works link cycles the images from a local folder. Files are named
     *   assets/images/<folder>/<folder>-NN.jpg   (2-digit, 1-based).
     * Every project points at "culturius" for now — give each its own folder
     * later and update its { folder, count } below. The ".me" trigger cycles
     * the local personal photos.
     * ---------------------------------------------------------------------- */
    const imgElement = document.getElementById("img");

    if (imgElement) {
        const PROJECTS = {
            // Folder names follow the homepage labels, not the legacy class
            // names: link-bsit shows "Lavender", link-lax "Bsit app",
            // link-aaa "Nova". Images exported from the Perso Figma file.
            ".link-proximus":  { folder: "proximus", count: 24 },
            ".link-culturius": { folder: "culturius", count: 24 },
            ".link-bsit":      { folder: "lavender", count: 24 },
            ".link-aaa":       { folder: "nova", count: 14 },
            ".link-lax":       { folder: "bsit", count: 23 },
        };

        let cycleTimer = null;
        let previous = -1;

        const projectSrc = (folder, i) =>
            `assets/images/${folder}/${folder}-${String(i).padStart(2, "0")}.jpg`;

        // Non-repeating random 1..count.
        const nextIndex = (count) => {
            if (count <= 1) return 1;
            let i;
            do {
                i = Math.floor(Math.random() * count) + 1;
            } while (i === previous);
            previous = i;
            return i;
        };

        // A 12.5fps image swap is a strobe to anyone sensitive to it, so when
        // reduced motion is asked for, show a single still instead of cycling.
        const wantsStillness = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

        // Cycle a project's folder, or the local "me" photos when project is null.
        const startCycle = (project) => {
            clearInterval(cycleTimer);
            previous = -1;
            const tick = () => {
                imgElement.src = project
                    ? projectSrc(project.folder, nextIndex(project.count))
                    : `assets/images/me/${nextIndex(LOCAL_IMAGE_COUNT)}.jpg`;
            };
            tick();
            if (wantsStillness.matches) return;
            cycleTimer = setInterval(tick, CYCLE_INTERVAL_MS);
        };

        const stopCycle = () => {
            clearInterval(cycleTimer);
            imgElement.removeAttribute("src");
        };

        // Preload a folder's images so the 80ms cycle never waits on the network.
        const preloadProject = ({ folder, count }) => {
            for (let i = 1; i <= count; i++) {
                new Image().src = projectSrc(folder, i);
            }
        };

        Object.entries(PROJECTS).forEach(([sel, project]) => {
            const el = document.querySelector(sel);
            if (!el) return;
            el.addEventListener("mouseenter", () => startCycle(project));
            el.addEventListener("mouseleave", stopCycle);
        });

        // ".me" cycles the local personal photos.
        const me = document.querySelector(".me");
        if (me) {
            me.addEventListener("mouseenter", () => startCycle(null));
            me.addEventListener("mouseleave", stopCycle);
        }

        // Preload the folders in use once the page is idle (deduped by folder).
        const seenFolders = new Set();
        const foldersInUse = [];
        Object.entries(PROJECTS).forEach(([sel, project]) => {
            if (document.querySelector(sel) && !seenFolders.has(project.folder)) {
                seenFolders.add(project.folder);
                foldersInUse.push(project);
            }
        });
        if (foldersInUse.length) {
            const warm = () => foldersInUse.forEach(preloadProject);
            window.addEventListener("load", () => {
                if ("requestIdleCallback" in window) requestIdleCallback(warm);
                else setTimeout(warm, 1200);
            });
        }
    }

    /* ---------------------------------------------------------------------- *
     * Click game (about page): every click flashes a random photo — held
     * fully visible for a moment, then faded out (see @keyframes game-flash).
     * ---------------------------------------------------------------------- */
    const clickGame = document.querySelector(".click-game");
    if (clickGame) {
        const gameImg = clickGame.querySelector(".click-game-img");
        let previousPhoto = null;

        clickGame.addEventListener("click", async () => {
            const name = randomIndex(LOCAL_IMAGE_COUNT, previousPhoto);
            previousPhoto = name;
            gameImg.src = `assets/images/me/${name}.jpg`;

            // Wait until the photo is actually decoded so the flash never
            // shows a blank or half-loaded image on a cold cache.
            try {
                await gameImg.decode();
            } catch {
                /* decode aborted (rapid clicks) or unsupported — show anyway */
            }

            // Restart the CSS flash animation from the top on every click.
            gameImg.classList.remove("is-flashing");
            void gameImg.offsetWidth; // forces a reflow so the animation replays
            gameImg.classList.add("is-flashing");
        });
    }

    /* ---------------------------------------------------------------------- *
     * Contact form (contact page): direct send, with silent bot defences
     * ---------------------------------------------------------------------- */
    const contactForm = document.getElementById("contactForm");
    if (contactForm) {
        const formFeedback = contactForm.querySelector(".form-feedback");
        const submitBtn = contactForm.querySelector(".submit-btn");
        const honeypot = contactForm.querySelector(".hp-field input");
        const celebration = contactForm.querySelector(".send-celebration");

        /* The page can't send mail by itself, so it POSTs the message to
         * Formspree, which forwards it to CONTACT_EMAIL. This is Formspree's
         * plain AJAX endpoint (POST + JSON + `Accept: application/json`), so
         * no Formspree library is needed and the page keeps its own submit
         * flow: honeypot, time-gate, and the send animation.
         *
         * The endpoint URL is public by design and belongs in client-side
         * code; it is not a secret. Blank it out to fall back to opening the
         * visitor's own mail app. */
        const FORMSPREE_ENDPOINT = "https://formspree.io/f/mnpandeq";
        const CONTACT_EMAIL = "bruno.mattelet@gmail.com";
        let sending = false;

        // Time-gate: bots fill and submit forms in milliseconds. A genuine
        // visitor needs longer to read and type, so a submit sooner than this
        // after page load is treated as a bot (together with the honeypot).
        const MIN_FILL_TIME_MS = 3000;
        const formReadyAt = Date.now();

        const showFeedback = (el, text) => {
            el.textContent = text;
            el.classList.remove("appear");
            // Restart the fade/slide on the next frame so it replays.
            requestAnimationFrame(() =>
                requestAnimationFrame(() => el.classList.add("appear"))
            );
        };

        /* ------------------------------------------------------------------ *
         * Inline validation messages
         *
         * The browser's own constraint checks stay in charge of what counts
         * as valid (`required`, `type="email"`) and of blocking the submit —
         * only the presentation changes: the default popup bubble is
         * suppressed and the message is rendered under the field instead, in
         * the same style as the form feedback.
         * ------------------------------------------------------------------ */
        const errorFor = (field, fieldName) => {
            if (field.validity.valueMissing) return `${fieldName} is required`;
            if (field.validity.typeMismatch && field.type === "email") {
                return "that email doesn't look right";
            }
            if (field.validity.tooShort) return `${fieldName} is a bit short`;
            // Anything else: fall back to the browser's own wording.
            return field.validationMessage;
        };

        // The honeypot is deliberately not `required`, so it never matches.
        contactForm
            .querySelectorAll("input[required], textarea[required]")
            .forEach((field) => {
                const wrap = field.closest(".form-field");
                const label = wrap && wrap.querySelector("label");
                const fieldName = label ? label.textContent.trim() : "this field";

                const error = document.createElement("span");
                error.className = "field-error";
                error.id = `${field.id}-error`;
                error.setAttribute("aria-live", "polite");
                field.insertAdjacentElement("afterend", error);

                const showError = (text) => {
                    error.textContent = text;
                    error.classList.add("appear");
                    field.setAttribute("aria-invalid", "true");
                    field.setAttribute("aria-describedby", error.id);
                };

                const clearError = () => {
                    error.classList.remove("appear");
                    field.removeAttribute("aria-invalid");
                    field.removeAttribute("aria-describedby");
                };

                // Fires during native validation (on submit, or on the
                // checkValidity() below); preventDefault drops the bubble.
                field.addEventListener("invalid", (event) => {
                    event.preventDefault();
                    showError(errorFor(field, fieldName));
                });

                // Check on the way out of a field the visitor actually typed
                // in, so a half-filled form doesn't nag before they're done.
                field.addEventListener("blur", () => {
                    if (field.value !== "") field.checkValidity();
                });

                field.addEventListener("input", () => {
                    if (field.validity.valid) clearError();
                });
            });

        /* Send sequence: the badge collapses the moment you submit, the
         * filled-in form folds away, and the confirmation takes its place.
         * The confirmation stays put — it is the receipt, so it must not
         * fade back out to nothing. */
        const sendAgainBtn = contactForm.querySelector(".send-again");

        const spawnConfetti = (host) => {
            const colors = ["--ink", "--accent", "--muted"];
            for (let i = 0; i < 18; i += 1) {
                const piece = document.createElement("span");
                piece.className = "confetti";
                // Fan upwards. The glasses sit against the left margin, so
                // the sideways throw is damped — a round burst would send
                // half the hearts off the edge of the page.
                const angle = (Math.PI * (0.08 + 0.84 * (i / 17))) * -1;
                const power = 80 + Math.random() * 70;
                piece.style.setProperty("--dx", `${Math.cos(angle) * power * 0.5}px`);
                piece.style.setProperty("--dy", `${Math.sin(angle) * power * 1.15}px`);
                piece.style.setProperty("--rot", `${(Math.random() - 0.5) * 540}deg`);
                // A glyph rather than a coloured box, so the hearts still take
                // their colour from the palette the "clr" switch generates.
                piece.textContent = "\u2665";
                piece.style.color = `var(${colors[i % colors.length]})`;
                piece.style.setProperty("--size", `${11 + Math.random() * 9}px`);
                // Tight stagger: the burst should read as one pop, not a drizzle.
                piece.style.animationDelay = `${Math.random() * 0.12}s`;
                host.appendChild(piece);
            }
        };

        /** Collapse the badge straight away, so submitting feels instant even
         *  when the network takes its time. Reversible — a failed send puts
         *  the badge back. */
        const startSending = () => {
            submitBtn.classList.add("is-sending");
            submitBtn.disabled = true;
        };

        const stopSending = () => {
            submitBtn.classList.remove("is-sending");
            submitBtn.disabled = false;
        };

        const celebrate = () => {
            // Fold the form away and wipe what was typed: the message is gone,
            // so leaving the old text sitting there invites a double send.
            contactForm.classList.add("is-sent");
            contactForm.reset();
            [...contactForm.querySelectorAll(".field-error")].forEach((error) =>
                error.classList.remove("appear")
            );

            // Let the fields finish folding before the receipt lands on top.
            setTimeout(() => {
                celebration.classList.add("is-active");
                spawnConfetti(celebration.querySelector(".send-beers"));
                // Move the reading position to the receipt for keyboard and
                // screen-reader users, who cannot see the form disappear.
                sendAgainBtn.focus({ preventScroll: true });
            }, 260);
        };

        /** Put the form back for a second message. */
        const resetForm = () => {
            celebration
                .querySelectorAll(".confetti")
                .forEach((piece) => piece.remove());
            celebration.classList.remove("is-active");
            contactForm.classList.remove("is-sent");
            stopSending();
            formFeedback.textContent = "";
            formFeedback.classList.remove("appear");
            sending = false;
            contactForm.elements.name.focus();
        };

        sendAgainBtn.addEventListener("click", resetForm);

        const openMailApp = ({ name, email, message }) => {
            const subject = encodeURIComponent(`Hey Bruno — note from ${name}`);
            const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
            window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
        };

        /** Posts the message to Formspree. Resolves "sent", or "mailto" when
         *  no endpoint is configured yet. Throws if Formspree rejects it. */
        const deliver = async (payload) => {
            if (!FORMSPREE_ENDPOINT) {
                openMailApp(payload);
                return "mailto";
            }
            const response = await fetch(FORMSPREE_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                // Formspree replies to the `email` field automatically;
                // `_subject` just makes the inbox easier to scan.
                body: JSON.stringify({
                    ...payload,
                    _subject: `Site note from ${payload.name}`,
                }),
            });
            if (!response.ok) {
                const detail = await response.json().catch(() => null);
                const reason = detail?.errors?.[0]?.message || response.status;
                throw new Error(`formspree refused it: ${reason}`);
            }
            return "sent";
        };

        contactForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (sending) return;

            const payload = {
                name: contactForm.name.value.trim(),
                email: contactForm.email.value.trim(),
                message: contactForm.message.value.trim(),
            };

            // Honeypot filled or superhuman fill speed → almost certainly a
            // bot. Play the normal success path but send nothing, so the bot
            // learns nothing from being caught.
            const looksLikeBot =
                honeypot.value !== "" ||
                Date.now() - formReadyAt < MIN_FILL_TIME_MS;
            if (looksLikeBot) {
                startSending();
                celebrate();
                return;
            }

            sending = true;
            startSending(); // instant feedback, before the network is involved
            try {
                const how = await deliver(payload);
                celebrate();
                if (how === "mailto") {
                    showFeedback(formFeedback, "opening your mail app… 🍺");
                }
            } catch (error) {
                // Nothing was sent: give the badge back so they can retry,
                // and leave everything they typed exactly where it was.
                sending = false;
                stopSending();
                showFeedback(
                    formFeedback,
                    `that didn't go through — mail me at ${CONTACT_EMAIL}`
                );
            }
        });
    }

    /* ---------------------------------------------------------------------- *
     * Skill counters (about page): every skill word is a clickable counter
     * that throws a "+1" flourish. Counts persist in the SQLite database
     * when the site runs behind server.py; on static hosting (no API) they
     * fall back to localStorage.
     * ---------------------------------------------------------------------- */
    const skillsWrapper = document.querySelector(".skills-wrapper");
    if (skillsWrapper) {
        const API_LIST = "/api/skills";
        const API_INCREMENT = "/api/skills/increment";
        const STORAGE_KEY = "skillCounts";
        let useLocalFallback = false;

        const localCounts = () => {
            try {
                return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
            } catch {
                return {}; /* corrupt storage — start from an empty set */
            }
        };
        const saveLocal = (name, count) => {
            const all = localCounts();
            all[name] = count;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        };

        const displays = new Map(); // name -> { valueEl, animTarget }

        const playPlusOne = (target, event) => {
            const plusOne = document.createElement("span");
            plusOne.textContent = "+1";
            plusOne.className = "plus-one-animation";
            // Spawn it where the click landed (relative to the target box),
            // rather than always at the same spot.
            if (event) {
                const rect = target.getBoundingClientRect();
                plusOne.style.left = `${event.clientX - rect.left}px`;
                plusOne.style.top = `${event.clientY - rect.top}px`;
            }
            target.appendChild(plusOne);
            // Duration must match the CSS animation length.
            setTimeout(() => plusOne.remove(), 800);
        };

        const setCount = (name, count) => {
            const display = displays.get(name);
            if (display) display.valueEl.textContent = count;
        };

        const increment = (name, event) => {
            const display = displays.get(name);
            const next = parseInt(display.valueEl.textContent, 10) + 1;
            setCount(name, next); // optimistic update
            playPlusOne(display.animTarget, event);
            if (useLocalFallback) {
                saveLocal(name, next);
                return;
            }
            fetch(API_INCREMENT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            })
                .then((res) => {
                    if (res.ok) return res.json();
                    // The API answered, so it is up — this one word just
                    // isn't in the database. Keep every other word talking to
                    // the server instead of dropping the page to localStorage.
                    throw Object.assign(new Error("rejected"), { answered: true });
                })
                .then(({ count }) => setCount(name, count)) // server value wins
                .catch((error) => {
                    if (error.answered) return; // optimistic count stands
                    useLocalFallback = true;
                    saveLocal(name, next);
                });
        };

        // Every word in the skill lists is its own counter. `data-skill` is
        // the database key, kept separate from the wording so the copy can be
        // reworded without silently detaching the counter; the first text
        // node is only a fallback for an item missing the attribute.
        skillsWrapper.querySelectorAll(".skill-item").forEach((item) => {
            const name = item.dataset.skill || item.childNodes[0].textContent.trim();
            const countWrap = document.createElement("span");
            countWrap.className = "skill-count";
            // Non-breaking space: a plain one lets the line break here, which
            // drops the number onto a line of its own below the word.
            countWrap.append("\u00A0(");
            const valueEl = document.createElement("span");
            valueEl.textContent = "0";
            countWrap.append(valueEl, ")");
            // Announce the new total, but only for the word just activated.
            countWrap.setAttribute("aria-live", "polite");
            // The counter belongs to the skill word, so place it straight
            // after the item's own text rather than after any trailing aside
            // (Skateboarding's "(not true)") — appended at the very end, it
            // gets pushed onto a line of its own below the word. The word's
            // own trailing space moves to the far side of the counter so an
            // aside doesn't end up butted against it.
            const label = item.firstChild;
            label.textContent = label.textContent.replace(/\s+$/, "");
            label.after(countWrap);
            if (countWrap.nextSibling) {
                countWrap.after(document.createTextNode(" "));
            }
            displays.set(name, { valueEl, animTarget: item });

            // These are controls, not decoration: give them a role, a tab
            // stop and the keyboard activation a button would have had.
            item.setAttribute("role", "button");
            item.setAttribute("tabindex", "0");
            item.addEventListener("click", (e) => increment(name, e));
            item.addEventListener("keydown", (e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault(); // Space would scroll the page
                increment(name, null);
            });
        });

        // Initial counts: database first, localStorage as fallback.
        fetch(API_LIST)
            .then((res) => (res.ok ? res.json() : Promise.reject()))
            .then((rows) =>
                rows.forEach(({ name, count }) => setCount(name, count))
            )
            .catch(() => {
                useLocalFallback = true;
                Object.entries(localCounts()).forEach(([name, count]) =>
                    setCount(name, count)
                );
            });
    }
});
