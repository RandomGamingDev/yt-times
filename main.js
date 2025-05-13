const parser = new DOMParser();

// Gets date published from video's page
const get_date_published = (html) => new Date(Date.parse(html.querySelectorAll("[itemprop='datePublished']")[0].getAttribute("content")))

function format_date(date, options) {
    return (options.showTime ? date.toLocaleString : date.toLocaleDateString).bind(date)
        (options.defaultLocale ?
            undefined :
            (options.dayFirst ? "en-GB" : "en-US")
        );
}

function replace_video_type_date(rel_elems, get_vid_id, get_date_elem, options) {
    const absDateClass = "absolute-date";

    for (const rel_elem of rel_elems) try {
        const date_elem = get_date_elem(rel_elem);
        
        if (!date_elem.classList.contains(absDateClass)) {
            fetch(`https://www.youtube.com${get_vid_id(rel_elem)}`)
                .then(res => res.text())
                .then(txt => {
                    const html = parser.parseFromString(txt, "text/html");
                    const date = get_date_published(html);
                    const formattedDate = format_date(date, options);

                    if (options.originalMessage) {
                        if (!date_elem.textContent.includes(formattedDate)) {
                            date_elem.textContent += ` (${formattedDate})`; // add date to original message
                        }
                    } else {
                        date_elem.textContent = formattedDate;  // replace original messsage
                    }

                    date_elem.classList.add(absDateClass);
                });
        }
    } catch (error) {}
}


function replace_dates(options) { // IMPORTANT!!! Find out when to activate this (after YouTube's rendered its dynamic content)
    // Recommendation page type videos
    replace_video_type_date(
        document.querySelectorAll("a#video-title-link"),
        rel_elem =>
            rel_elem.getAttribute("href"),
        rel_elem => 
            rel_elem
                .parentElement // h3
                .parentElement // div id="meta"
                .children[1] // ytd-video-meta-block
                .children[0] // div id="metadata"
                .children[1] // div id="metadata-line"
                .children[3], //span
        options
    );

    // Side bar recommendations type videos
    replace_video_type_date(
        document.querySelectorAll("span#video-title"),
        rel_elem => 
            rel_elem
                .parentElement
                .parentElement
                .getAttribute("href"),
        rel_elem => 
            rel_elem
                .parentElement // h3
                .parentElement // a
                .children[1] // div
                .children[0] // ytd-video-meta-block
                .children[0] // div id="metadata"
                .children[1] // div id="metadata-line"
                .children[3], // span
        options
    );

    // Search type videos
    replace_video_type_date(
        document.querySelectorAll("a#video-title"),
        rel_elem => 
            rel_elem.getAttribute("href"),
        rel_elem => 
            rel_elem
                .parentElement // h3
                .parentElement // div id="title-wrapper"
                .parentElement // div id="meta"
                .children[1] // ytd-video-meta-block
                .children[0] // div id="metadata"
                .children[1] // div id="metadata-line"
                .children[3], // span
        options
    );

    // Playlist type videos
    replace_video_type_date(
        document.querySelectorAll("a#video-title"),
        rel_elem => 
            rel_elem.getAttribute("href"),
        rel_elem => 
            rel_elem
                .parentElement // h3
                .parentElement // div id="meta"
                .children[1] // ytd-video-meta-block
                .children[0] // div id="metadata"
                .children[0] // div id="byline-container"
                .children[2] // yt-formatted-string id="video-info"
                .children[2], // span
        options
    );

    // Channel Home page videos
    replace_video_type_date(
        document.querySelectorAll("a#video-title"),
        rel_elem => 
            rel_elem.getAttribute("href"),
        rel_elem => 
            rel_elem
                .parentElement // h3
                .parentElement // div id="meta"
                .children[1] // div id="metadata-container"
                .children[0] // div id="metadata"
                .children[1] // div id="metadata-line"
                .children[1], // span
        options
    );

    for (const info_elem of document.querySelectorAll("yt-formatted-string#info")) try {
        info_elem
            .children[2] // Relative timestamp
            .textContent =
                format_date(get_date_published(document), options);
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



observer.observe(document, { childList: true, subtree: true });

// In milliseconds
const replaceDelay = 250;
setInterval(
    function() {
        if (!DOMMutated)
            return;

        replace_dates(userOptions);
        DOMMutated = false;
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