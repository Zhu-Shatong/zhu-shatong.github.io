const citationCountElements = document.querySelectorAll('.semantic-scholar-citation');

let renderCitationBadge = (element, count, url) => {
    if (count === null || count === undefined || count === '') {
        return;
    }

    const source = element.getAttribute('data-citation-source');
    const isGoogleScholar = source && source.toLowerCase().includes('google');
    const icon = isGoogleScholar ? 'fab fa-google-scholar' : 'ai ai-semantic-scholar';
    const labelPrefix = source ? `${source} ` : '';
    const label = `${labelPrefix}${parseInt(count).toLocaleString()} citations`;
    const href = url || element.getAttribute('data-citation-url');
    const badgeContent = `<i class="${icon}"></i> ${label}`;

    if (href) {
        element.innerHTML = `<a class="badge badge-pill badge-publication badge-light" href="${href}" target="_blank">${badgeContent}</a>`;
    } else {
        element.innerHTML = `<span class="badge badge-pill badge-publication badge-light">${badgeContent}</span>`;
    }
};

citationCountElements.forEach(element => {
    const id = element.getAttribute('data-semantic-scholar-id');
    const fallback = element.getAttribute('data-citation-count-fallback');

    if (id) {
        element.setAttribute('data-semantic-scholar-id', id.toLowerCase());
    }

    renderCitationBadge(element, fallback);
});

const semanticScholarIds = new Set(Array.from(citationCountElements).map(element => element.getAttribute('data-semantic-scholar-id')).filter(id => id));

let uncachedSemanticScholarIds = [];
semanticScholarIds.forEach(id => {
    const cacheKey = `semanticScholarCitationCount:${id}`;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        const { timestamp } = JSON.parse(cachedData);
        // If cached data is older than 1 hour, consider it uncached
        if (Date.now() - timestamp > 1 * 60 * 60 * 1000) {
            uncachedSemanticScholarIds.push(id);
        }
    } else {
        uncachedSemanticScholarIds.push(id);
    }
});

let showSemanticScholarCitationCount = () => {
    // Update the DOM with the cached citation counts
    semanticScholarIds.forEach(id => {
        const cacheKey = `semanticScholarCitationCount:${id}`;
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            const { citationCount, url } = JSON.parse(cachedData);
            const elements = document.querySelectorAll(`[data-semantic-scholar-id="${id}"]`);
            elements.forEach(element => {
                renderCitationBadge(element, citationCount, url);
            });
        }
    });
};

if (uncachedSemanticScholarIds.length > 0) {
    fetch('https://api.semanticscholar.org/graph/v1/paper/batch?fields=citationCount,url', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ids: uncachedSemanticScholarIds
        })
    }).then(response => {
        if (!response.ok) {
            throw new Error(`Semantic Scholar API returned ${response.status}`);
        }

        return response.json();
    }).then(data => {
        if (!Array.isArray(data)) {
            return;
        }

        data.forEach((paper, index) => {
            if (!paper) {
                return;
            }

            const requestedId = uncachedSemanticScholarIds[index];
            // Cache citation count data
            const cacheKey = `semanticScholarCitationCount:${requestedId}`;
            const cacheData = {
                citationCount: paper.citationCount,
                url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
                timestamp: Date.now()
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        });
    }).catch(error => {
        console.error('Error fetching Semantic Scholar data:', error);
    }).finally(showSemanticScholarCitationCount);
} else {
    showSemanticScholarCitationCount();
}
