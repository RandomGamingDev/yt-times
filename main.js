console.log("Hello, World!");

const parser = new DOMParser();

const get_date_published = (html) => {
    const meta = html.querySelector("[itemprop='datePublished']");
    if (!meta) return NaN;
    return new Date(Date.parse(meta.getAttribute("content")));
};

function format_date(date, options) {
    if (isNaN(date)) return "Unknown Date";
    return (options.showTime ? date.toLocaleString : date.toLocaleDateString).bind(date)
        (options.defaultLocale ?
            undefined :
            (options.dayFirst ? "en-GB" : "en-US")
        );
}

function replace_dates(options, ignoreCache = false) {
    const absDateClass = "absolute-date";

    const containers = new Set();
    const links = document.querySelectorAll('a[href^="/watch"]');
    for (const link of links) {
        const container = link.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-playlist-video-renderer');
        if (container) containers.add(container);
    }

    if (containers.size > 0 && !ignoreCache) {
        console.log(`Found ${containers.size} containers from ${links.length} links`);
    }

    let i = 0;
    for (const container of containers) try {
        const thumbnail = container.querySelector('a#thumbnail, a.ytd-thumbnail, a[href^="/watch"]');
        if (!thumbnail) continue;
        const href = thumbnail.getAttribute("href");
        if (!href || href.includes("/shorts/")) continue; // Skip shorts for debugging

        // Try to find the date element generically
        let spans = Array.from(container.querySelectorAll('span.inline-metadata-item, span.ytd-video-meta-block, #metadata span, #metadata-line span')).filter(s => s.textContent.trim().length > 0);
        
        let date_elem = spans.length > 0 ? spans[spans.length - 1] : null;

        if (!date_elem) {
            // Aggressive fallback: get all spans in the container
            const allSpans = Array.from(container.querySelectorAll('span')).filter(s => s.textContent.trim().length > 0);
            if (allSpans.length > 0) {
                date_elem = allSpans[allSpans.length - 1];
            }
        }

        if (!date_elem) { 
            if (i===0) {
                console.log("CRITICAL: Still no date_elem found for", href);
                // Dump the flat DOM structure of this container to see what classes/IDs YouTube uses now
                const domMap = Array.from(container.querySelectorAll('*'))
                    .map(e => e.tagName.toLowerCase() + (e.id ? '#'+e.id : '') + (e.className && typeof e.className === 'string' ? '.'+e.className.replace(/ /g, '.') : ''))
                    .join('\n');
                console.log(domMap);
            }
            continue; 
        }

        if (ignoreCache || !date_elem.classList.contains(absDateClass)) {
            if (i<5) console.log("Fetching for", href, "using date_elem", date_elem);
            i++;
            // mark immediately to prevent duplicate fetches
            date_elem.classList.add(absDateClass);

            fetch(`https://www.youtube.com${href}`)
                .then(res => res.text())
                .then(txt => {
                    const html = parser.parseFromString(txt, "text/html");
                    const date = get_date_published(html);
                    if (isNaN(date)) {
                        date_elem.classList.remove(absDateClass);
                        return;
                    }
                    const formattedDate = format_date(date, options);

                    if (options.originalMessage) {
                        if (!date_elem.textContent.includes(formattedDate)) {
                            date_elem.textContent += ` (${formattedDate})`;
                        }
                    } else {
                        date_elem.textContent = formattedDate;
                    }
                })
                .catch(err => {
                    console.error("Fetch/parse error:", err);
                    date_elem.classList.remove(absDateClass);
                });
        }
    } catch (error) {
        console.error("Error processing container:", error, container);
    }

    // Main video page
    for (const info_elem of document.querySelectorAll("yt-formatted-string#info")) try {
        const spans = Array.from(info_elem.children).filter(s => s.tagName.toLowerCase() === 'span');
        if (spans.length >= 3) {
            const date = get_date_published(document);
            if (!isNaN(date)) {
                spans[2].textContent = format_date(date, options);
            }
        }
    } catch {}
}

let DOMMutated = false;

const defaultUserOptions = {
    originalMessage: false, // Set true for "14 years ago" style
    dayFirst: true, // Set true for "day-month" format
    showTime: true, // Set true for showing time of day after the date (e.g. 12:00:45)
    defaultLocale: true // Use the default locale of the computer
};

let userOptions = defaultUserOptions;

// Load initial options
loadOptions();

replace_dates(userOptions);
const observer = new MutationObserver((mutations) => {
    DOMMutated = true;
});

observer.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });

// In milliseconds
const replaceDelay = 250;
let ignoreCache = false;
setInterval(
    function () {
        if (!DOMMutated)
            return;

        replace_dates(userOptions, ignoreCache);

        DOMMutated = false;
        ignoreCache = false;

        const cdrClass = "cacheless-date-replace-event"
        for (const sort of document.querySelectorAll("#chips[role='tablist'] > yt-chip-cloud-chip-renderer"))
            if (!sort.classList.contains(cdrClass)) {
                sort.addEventListener("click", () => {
                    ignoreCache = true;
                });
                sort.classList.add(cdrClass);
            }
    },
    replaceDelay
);

function loadOptions() {
    browser.storage.sync.get('userOptions').then((data) => {
        userOptions = data.userOptions || defaultUserOptions;
        console.log('loaded options:', userOptions);
    }).catch((error) => {
        console.error('Error loading options:', error);
    });
}