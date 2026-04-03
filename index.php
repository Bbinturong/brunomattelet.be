<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <!-- Ensures proper rendering and touch zooming on all devices -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- It's good practice to load reset/normalize CSS first -->
    <link rel="stylesheet" type="text/css" href="assets/style/reset.css">
    <link rel="stylesheet" type="text/css" href="assets/style/style.css">
    <link rel="icon" type="image/png" href="assets/images/favicon.png" />

    <title>brn • mttlt</title>
</head>
<body>

    <!-- The <header> element contains introductory content or a set of navigational links. -->
    <header>
        <h1 class='logo'><a href="index.html">brn • std</a></h1>
        <nav>
            <ul class="main_nav link-nav">
                <li><a href="about.html">abt</a></li>
                <li><a href="work.html">wrk</a></li>
                <li><a href="contact.html">cntct</a></li>
            </ul>
        </nav>
    </header>

    <!-- This is the central visual element, which will now adapt across screen sizes -->
    <div class='squared'>
        <div class='text-baseline'>
            <p class='proximus-baseline'>Mobile app • 2023 • Case study</p>
            <p class='culturius-baseline'>Responsive website • 2022</p>
            <p class='bsit-baseline'>Mobile app • 2020</p>
            <p class='aaa-baseline'>Web experiment • 2016 • Case study</p>
            <p class='lax-baseline'>Web documentary • 2015 • Case study</p>
        </div>
        <div class='img'>
            <!-- Alt text is crucial for accessibility -->
            <img id="img" src="" alt="">
        </div>
    </div>

    <!-- The <main> tag specifies the main content of a document. -->
    <main>
        <section class="main-section" id='intro'>
            <h2 class="big-title">Hey,</h2>
            <p>I’m <span class='me inline-link cursor-beer'>Bruno</span>, belgian designer specialized in functional user experience and minimalist user interface.</p>
            <p>Actually based in Brussels and working with <a class='link-movify cursor-ballon inline-link' target="_blank" href="https://www.movify.com//">Movify</a> at <a class='cursor-satelite inline-link' target="_blank" href="https://www.proximus.com/">Proximus</a>.</p>
        </section>

        <section class="main-section" id='works'>
            <h1 class="big-title">Works</h1>
            <ul class='works-list'>
                <li class='works-links'><a class='cursor-satelite link-proximus' href="https://parentalist.com/" target="_blank">Proximus +</a></li>
                <li class='works-links'><a class='cursor-external link-culturius' href="https://bsit.com/en/parent" target="_blank">Culturius</a></li>
                <li class='works-links'><a class='cursor-bear link-bsit' href="http://brunomattelet.be/aaa/" target="_blank">Bsit</a></li>
                <li class='works-links'><a class='cursor-tiger link-aaa' href="#" target="_blank">Adopt An Animal</a></li>
                <li class='works-links'><a class='cursor-lacrosse link-lax' href="#" target="_blank">Lacrosse</a></li>
            </ul>
        </section>

        <section class="main-section contact-section" id='contact'>
            <h1 class="big-title">Contact</h1>
            <p>Wanna discuss a future project, some misspelling I did or anything else?</p>
            <p>Drop me a note and let's grab a beer.</p>
            <p><a class="cursor-chat link-chat inline-link" href="#">Let’s discuss</a></p>
        </section>
    </main>

    <!-- The <footer> element defines a footer for a document or section. -->
    <footer>
        <ul class="social-list">
            <li><a target="_blank" href="https://open.spotify.com/">sptf</a></li>
            <li><a target="_blank" href="https://www.instagram.com/">nstgrm</a></li>
            <li><a target="_blank" href="https://www.facebook.com/">fcbck</a></li>
            <li><a target="_blank" href="https://x.com/">x</a></li>
        </ul>
        <span class='geo'>50°50'26.1"N 4°23'32.9"E</span>
    </footer>

    <script>
        // Wait for the DOM to be fully loaded before running the script
        document.addEventListener("DOMContentLoaded", () => {
            // Cache DOM elements for better performance
            const imgElement = document.getElementById("img");
            
            // State variables for image logic
            let changingImage = null;
            let previousImage = null;

            /**
             * Generates a random index for image selection, ensuring it's not the same as the previous one.
             * @param {number} max - The maximum number of images.
             * @param {number} previous - The index of the previously shown image.
             * @returns {number} A new random image index.
             */
            const getRandomImageIndex = (max, previous) => {
                let index;
                do {
                    index = Math.floor(Math.random() * max) + 1;
                } while (index === previous);
                return index;
            };
            
            /**
             * Changes the image source from a local folder, creating a rapid-change effect.
             * @param {string} folder - The subfolder within 'assets/images/'.
             * @param {number} [maxImages=29] - The number of images in the folder.
             */
            const changeImg = (folder, maxImages = 29) => {
                clearInterval(changingImage);
                const imageName = getRandomImageIndex(maxImages, previousImage);
                imgElement.src = `assets/images/${folder}/${imageName}.jpg`;
                previousImage = imageName;
                changingImage = setInterval(() => changeImg(folder, maxImages), 80);
            };

            /**
             * Clears the image and stops the animation interval.
             */
            const clearImage = () => {
                clearInterval(changingImage);
                imgElement.src = "";
            };

            /**
             * Fetches and displays a random image from a specific Unsplash collection.
             * @param {string} collection - The Unsplash collection ID.
             * @param {number} [totalImages=3] - The number of random images to fetch.
             */
            const unsplashImg = (collection, totalImages = 3) => {
                clearInterval(changingImage);
                const unsplashAPIKey = "mzADxqRYqLD-mI6NOWgcK8t6Md9g2T_yS_3plCfpuxc";
                const url = `https://api.unsplash.com/photos/random?count=${totalImages}&client_id=${unsplashAPIKey}&collection=${collection}`;

                fetch(url)
                    .then(response => response.json())
                    .then(data => {
                        const index = getRandomImageIndex(totalImages, previousImage) - 1;
                        const imageUrl = data[index]?.urls?.regular;
                        if (imageUrl) {
                            imgElement.src = imageUrl;
                            previousImage = index;
                        }
                    })
                    .catch(error => console.error("Unsplash API error:", error));
            };

            /**
             * Clears the image source when using the Unsplash effect.
             */
            const clearUnsplashImg = () => {
                clearInterval(changingImage);
                imgElement.src = "";
            };

            /**
             * A generic helper function to bind mouse enter/leave events to an element.
             * @param {string} linkSelector - The CSS selector for the trigger element.
             * @param {string|null} baselineSelector - The CSS selector for the text to appear.
             * @param {Function} onEnter - The function to call on mouseenter.
             * @param {Function} onLeave - The function to call on mouseleave.
             */
            const bindHover = (linkSelector, baselineSelector, onEnter, onLeave) => {
                const link = document.querySelector(linkSelector);
                const baseline = baselineSelector ? document.querySelector(baselineSelector) : null;

                if (link) {
                    link.addEventListener("mouseenter", () => {
                        if (baseline) baseline.classList.add("text-baseline-appear");
                        if (onEnter) onEnter();
                    });
                    link.addEventListener("mouseleave", () => {
                        if (baseline) baseline.classList.remove("text-baseline-appear");
                        if (onLeave) onLeave();
                    });
                }
            };

            // --- Define projects and their specific effects ---
            const standardProjects = [
                { link: ".link-proximus", baseline: ".proximus-baseline" },
                { link: ".link-culturius", baseline: ".culturius-baseline" },
                { link: ".link-aaa", baseline: ".aaa-baseline" },
                { link: ".link-lax", baseline: ".lax-baseline" },
            ];

            // Bind standard hover effect to most project links
            standardProjects.forEach(({ link, baseline }) => {
                bindHover(link, baseline, () => changeImg("me"), clearImage);
            });

            // Bind special Unsplash effect for the Bsit link (fixing original bug)
            bindHover(".link-bsit", ".bsit-baseline", () => unsplashImg("Culture"), clearUnsplashImg);

            // Bind effect for the 'me' span in the intro
            bindHover(".me", null, () => changeImg("me"), clearImage);
        });
    </script>
</body>
</html>
