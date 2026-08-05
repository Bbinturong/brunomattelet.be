/**
 * brn • std — reusable page chrome.
 *
 * <site-header> and <site-footer> render the shared header/footer markup
 * into the light DOM, so the existing `header`/`footer` CSS rules apply
 * unchanged. Edit the markup here once and every page picks it up.
 *
 * Usage:
 *   <site-header logo="brn • std"></site-header>   (logo attribute optional)
 *   <site-footer></site-footer>
 */
class SiteHeader extends HTMLElement {
    connectedCallback() {
        const logo = this.getAttribute("logo") || "brn • std";
        this.innerHTML = `
    <header>
        <h1 class='logo'><a href="index.html">${logo}</a></h1>
        <nav>
            <ul class="main_nav link-nav">
                <li><a href="about.html">abt</a></li>
                <!-- <li><a href="work.html">wrk</a></li> -->
                <li><a href="contact.html">cntct</a></li>
                <li class="color-me-wrap">
                    <span class="color-me-label" aria-hidden="true">clr</span>
                    <button type="button" class="color-me" role="switch" aria-checked="false" title="Color the site — every switch is a new palette" aria-label="Toggle the site color palette">
                        <span class="color-me-knob" aria-hidden="true"></span>
                    </button>
                </li>
            </ul>
        </nav>
    </header>`;

        // Mark the nav item for the current page as active (forces the hover
        // state via CSS). Only the nav's own pages match — the project pages
        // are not treated as "works" active.
        const page = location.pathname.split("/").pop() || "index.html";
        const link = this.querySelector(`.main_nav a[href="${page}"]`);
        if (link) link.setAttribute("aria-current", "page");
    }
}

class SiteFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
    <footer>
        <ul class="social-list">
            <li><a target="_blank" rel="noopener" href="https://open.spotify.com/">sptf</a></li>
            <li><a target="_blank" rel="noopener" href="https://www.instagram.com/">nstgrm</a></li>
            <li><a target="_blank" rel="noopener" href="https://www.facebook.com/">fcbck</a></li>
            <li><a target="_blank" rel="noopener" href="https://x.com/">x</a></li>
        </ul>
        <span class='geo'>50°50'26.1"N 4°23'32.9"E</span>
    </footer>`;
    }
}

customElements.define("site-header", SiteHeader);
customElements.define("site-footer", SiteFooter);
