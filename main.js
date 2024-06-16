const parser = new DOMParser();

// Gets date published from video's page
const get_date_published = (html) => new Date(Date.parse(html.querySelectorAll("[itemprop='datePublished']")[0].getAttribute("content")))

function replace_video_type_date(rel_elems, get_vid_id, get_date_elem) {
    const absDateClass = "absolute-date";

    for (const rel_elem of rel_elems) try {
        const date_elem = get_date_elem(rel_elem);
        if (!date_elem.classList.contains(absDateClass))
            fetch(`https://www.youtube.com${ get_vid_id(rel_elem) }`)
                .then(res => res.text())
                .then(txt => {
                    const html = parser.parseFromString(txt, "text/html");
                    const date = get_date_published(html);
                    const str_date = date.toLocaleString();

                    date_elem.innerHTML = str_date;
                    date_elem.classList.add(absDateClass);
                });
    } catch {}
}

function replace_dates() { // IMPORTANT!!! Find out when to activate this (after youtube's rendered its dynamic content)
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
                .children[3] //span
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
                .children[3] // span
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
                .children[3] // span
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
                .children[2] // span
    );

    for (const info_elem of document.querySelectorAll("yt-formatted-string#info"))
        info_elem
            .children[2] // Relative timestamp
            .innerHTML =
                get_date_published(document)
                    .toLocaleString();
}

let DOMMutated = false;

replace_dates();
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

        replace_dates();
        DOMMutated = false;
    },
    replaceDelay
);