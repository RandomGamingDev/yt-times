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

const dateCache = new Map();
const fetchingSet = new Set();

function replace_dates(options, ignoreCache = false) {
    const containers = new Set();
    const links = document.querySelectorAll('a[href^="/watch"]');
    
    // Log missed links once per cycle for debugging
    let missedLinksLogged = 0;

    for (const link of links) {
        const container = link.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-playlist-video-renderer, yt-lockup-view-model, ytd-item-section-renderer, ytd-rich-grid-media, ytd-reel-item-renderer');
        if (container) {
            containers.add(container);
        } else if (missedLinksLogged < 5) {
            // Find what the actual container is for links we are missing
            let p = link.parentElement;
            let path = "";
            for (let k=0; k<5 && p; k++) {
                path += p.tagName.toLowerCase() + (p.className ? '.'+p.className.split(' ').join('.') : '') + " -> ";
                p = p.parentElement;
            }
            console.log("Missed link container path:", path, link);
            missedLinksLogged++;
        }
    }

    for (const container of containers) try {
        const thumbnail = container.querySelector('a#thumbnail, a.ytd-thumbnail, a[href^="/watch"]');
        if (!thumbnail) continue;
        const href = thumbnail.getAttribute("href");
        if (!href || href.includes("/shorts/")) continue; 

        const textNodesToUpdate = [];
        let alreadyUpdated = false;
        
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            const val = node.nodeValue.trim();
            if (val.length === 0) continue;
            
            const parent = node.parentElement;
            if (parent && (parent.id === 'video-title' || parent.closest('#video-title, #video-title-link'))) {
                continue; // Skip video titles that might coincidentally be "1 day ago"
            }

            if (dateCache.has(href) && val.includes(dateCache.get(href))) {
                alreadyUpdated = true;
                continue; 
            }
            
            // Match standard YouTube relative date strings
            if (val.match(/(Streamed |Premiered )?\d+ (second|minute|hour|day|week|month|year)s? ago/i)) {
                textNodesToUpdate.push(node);
            }
        }
        
        if (alreadyUpdated && textNodesToUpdate.length === 0) {
            continue; 
        }

        if (textNodesToUpdate.length > 0) {
            if (dateCache.has(href)) {
                const formattedDate = dateCache.get(href);
                for (const n of textNodesToUpdate) {
                    if (options.originalMessage) {
                        n.nodeValue = `${n.nodeValue.trim()} (${formattedDate})`;
                    } else {
                        n.nodeValue = formattedDate;
                    }
                }
            } else if (!fetchingSet.has(href) || ignoreCache) {
                fetchingSet.add(href);
                
                fetch(`https://www.youtube.com${href}`)
                    .then(res => res.text())
                    .then(txt => {
                        const html = parser.parseFromString(txt, "text/html");
                        const date = get_date_published(html);
                        if (isNaN(date)) {
                            fetchingSet.delete(href);
                            return;
                        }
                        const formattedDate = format_date(date, options);
                        dateCache.set(href, formattedDate);
                    })
                    .catch(err => {
                        fetchingSet.delete(href);
                    });
            }
        }
    } catch (error) {
        // fail silently for individual containers
    }

    // Main video page (New YouTube UI uses ytd-watch-metadata)
    try {
        const watchMetaSpans = document.querySelectorAll('ytd-watch-metadata span, ytd-watch-metadata yt-formatted-string, #description-inner span, #description-inner yt-formatted-string');
        for (const span of watchMetaSpans) {
            if (span.children.length === 0 && span.textContent.match(/(second|minute|hour|day|week|month|year)s? ago/i)) {
                const date = get_date_published(document);
                if (!isNaN(date)) {
                    const formattedDate = format_date(date, options);
                    if (!span.textContent.includes(formattedDate)) {
                        if (options.originalMessage) {
                            const baseText = span.textContent.replace(/\s*\(.*?\)$/, ''); 
                            span.textContent = `${baseText} (${formattedDate})`;
                        } else {
                            span.textContent = formattedDate;
                        }
                    }
                }
                break; 
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