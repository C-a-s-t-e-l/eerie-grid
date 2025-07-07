document.addEventListener('DOMContentLoaded', () => {

    let fullStoryList = [];
    let currentFilteredList = [];
    let currentPage = 1;
    const storiesPerPage = 9;

    const storyListContainer = document.getElementById('story-list-container');
    const paginationContainer = document.getElementById('pagination-container');
    const modal = document.getElementById('story-modal');
    const modalTitle = document.getElementById('modal-story-title');
    const modalLocation = document.getElementById('modal-story-location');
    const modalAuthor = document.getElementById('modal-story-author');
    const modalFullStory = document.getElementById('modal-full-story');
    const closeButtonTop = document.getElementById('modal-close-button-top');
    const closeButtonBottom = document.getElementById('modal-close-button-bottom');
    const viewOnGridButton = document.getElementById('modal-view-on-grid');
    const searchBar = document.getElementById('story-search-bar');
    const sortSelect = document.getElementById('sort-stories');

    function formatDate(dateString) {
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };
    const date = new Date(dateString);

    const formattedDate = new Intl.DateTimeFormat('en-US', options).format(date);
    return formattedDate.replace(' at', ' -').replace(/(AM|PM)/g, (match) => match.toLowerCase());
}

    function initializeStories() {
        const chronoSortedStories = [...dummyStories].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        fullStoryList = chronoSortedStories.map((story, index) => ({
            ...story,
            caseFile: index + 1
        }));
        handleSortAndFilter();
    }
    
    function renderStories(storiesToRender, page = 1) {
        if (!storyListContainer) return;
        storyListContainer.innerHTML = '';

        if (storiesToRender.length === 0) {
            storyListContainer.innerHTML = '<p class="no-results">No stories found. The spirits are quiet...</p>';
            return;
        }

        const startIndex = (page - 1) * storiesPerPage;
        const endIndex = startIndex + storiesPerPage;
        const paginatedItems = storiesToRender.slice(startIndex, endIndex);

        paginatedItems.forEach(story => {
            const formattedDate = formatDate(story.createdAt); 
            const caseTag = `Archive #${String(story.caseFile).padStart(4, '0')} - ${formattedDate}`;
            

            const storyCard = `
                <div class="story-card" data-story-id="${story.id}">
                    <p class="story-card-casetag">${caseTag}</p>
                    <div class="story-card-content">
                        <p class="story-card-location"><i class="fas fa-map-pin"></i>${story.locationName}</p>
                        <h3 class="story-card-title">${story.title}</h3>
                        <p class="story-card-author">By: ${story.authorNickname || 'Unknown'}</p>
                        
                        <p class="story-card-snippet">${story.snippet}</p>
                       
                        
                    </div>
                    <div class="story-card-actions">
                        <button class="eerie-button primary btn-read" data-story-id="${story.id}">
                            <i class="fas fa-book-open"></i> Read Full Story
                        </button>
                    </div>
                
                </div>
            `;
            storyListContainer.innerHTML += storyCard;
        });
    }
    function setupPagination(items) {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = "";
        
        const pageCount = Math.ceil(items.length / storiesPerPage);
        if (pageCount <= 1) return;

        const prevButton = document.createElement('button');
        prevButton.innerHTML = '«';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                handlePageChange();
            }
        });
        paginationContainer.appendChild(prevButton);

        const maxVisibleButtons = 7;
        if (pageCount <= maxVisibleButtons) {
            for (let i = 1; i <= pageCount; i++) {
                paginationContainer.appendChild(createPageButton(i));
            }
        } else {
            paginationContainer.appendChild(createPageButton(1));
            
            if (currentPage > 4) {
                paginationContainer.appendChild(createEllipsis());
            }

            let start = Math.max(2, currentPage - 1);
            let end = Math.min(pageCount - 1, currentPage + 1);

            if(currentPage <= 4) {
                start = 2;
                end = 5;
            }
            if(currentPage >= pageCount - 3) {
                start = pageCount - 4;
                end = pageCount - 1;
            }
            
            for (let i = start; i <= end; i++) {
                paginationContainer.appendChild(createPageButton(i));
            }

            if (currentPage < pageCount - 3) {
                paginationContainer.appendChild(createEllipsis());
            }

            paginationContainer.appendChild(createPageButton(pageCount));
        }

        const nextButton = document.createElement('button');
        nextButton.innerHTML = '»';
        nextButton.disabled = currentPage === pageCount;
        nextButton.addEventListener('click', () => {
            if (currentPage < pageCount) {
                currentPage++;
                handlePageChange();
            }
        });
        paginationContainer.appendChild(nextButton);
    }

    function createPageButton(page) {
        let button = document.createElement('button');
        button.innerText = page;
        if (currentPage == page) button.classList.add('active');
        button.addEventListener('click', function () {
            currentPage = page;
            handlePageChange();
        });
        return button;
    }

    function createEllipsis() {
        const ellipsis = document.createElement('span');
        ellipsis.innerText = '...';
        ellipsis.style.padding = '8px';
        return ellipsis;
    }

    function handlePageChange() {
        renderStories(currentFilteredList, currentPage);
        setupPagination(currentFilteredList);
        window.scrollTo(0, 0); 
    }

    function populateModal(storyId) {
        const storyData = fullStoryList.find(s => s.id == storyId);
        if (!storyData) return;

        modalTitle.textContent = storyData.title;
        modalLocation.innerHTML = `<em><i class="fas fa-map-pin"></i> ${storyData.locationName}</em>`;
        modalAuthor.innerHTML = `<em><i class="fas fa-user-ghost"></i> By: ${storyData.authorNickname || 'Unknown'}</em>`;
        modalFullStory.innerHTML = `<p>${storyData.fullStory.replace(/\n/g, '</p><p>')}</p>`;

        viewOnGridButton.dataset.storyId = storyData.id;
        openModal();
    }
    
    function openModal() {
        modal.classList.remove('modal-hidden');
        modal.classList.add('modal-visible');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.add('modal-hidden');
        modal.classList.remove('modal-visible');
        document.body.style.overflow = '';
    }

    function handleSortAndFilter() {
        let filteredStories = [...fullStoryList];
        const searchTerm = searchBar.value.toLowerCase();
        
        if (searchTerm) {
            filteredStories = filteredStories.filter(story => 
                story.title.toLowerCase().includes(searchTerm) ||
                (story.authorNickname && story.authorNickname.toLowerCase().includes(searchTerm)) ||
                story.locationName.toLowerCase().includes(searchTerm) ||
                story.snippet.toLowerCase().includes(searchTerm)
            );
        }

        const sortBy = sortSelect.value;
        if (sortBy === 'newest') {
            filteredStories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (sortBy === 'oldest') {
            filteredStories.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        } else if (sortBy === 'title-az') {
            filteredStories.sort((a, b) => a.title.localeCompare(b.title));
        }
        
        currentFilteredList = filteredStories;
        currentPage = 1;
        renderStories(currentFilteredList, currentPage);
        setupPagination(currentFilteredList);
    }

    if (storyListContainer) {
        storyListContainer.addEventListener('click', (e) => {
            const readButton = e.target.closest('.btn-read');
            if (readButton) {
                populateModal(readButton.dataset.storyId);
            }
        });
    }

    if (viewOnGridButton) {
        viewOnGridButton.addEventListener('click', (e) => {
            const storyId = e.currentTarget.dataset.storyId;
            window.location.href = `map.html?story=${storyId}`;
        });
    }

    if (closeButtonTop && closeButtonBottom && modal) {
        [closeButtonTop, closeButtonBottom].forEach(btn => btn.addEventListener('click', closeModal));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('modal-visible')) {
                closeModal();
            }
        });
    }
    
    if (searchBar) searchBar.addEventListener('input', handleSortAndFilter);
    if (sortSelect) sortSelect.addEventListener('change', handleSortAndFilter);

    initializeStories();
});