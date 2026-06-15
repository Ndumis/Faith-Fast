// bible.js - Fixed and improved version
class Bible {
    constructor() {
        this.books = [];
        this.selectedBook = null;
        this.selectedChapter = null;
        this.verses = [];
        this.currentTestament = 'all';
        this.currentBookId = null;
        this.currentChapter = null;
        this.highlights = {};
        this.highlightColors = ['yellow', 'green', 'blue', 'pink'];
        this.init();
    }

    async init() {
        try {
            await this.loadBooks();
            this.setupEventListeners();
            this.populateTestamentFilter();
            this.populateBookFilter();
            this.showWelcomeMessage();
        } catch (error) {
            console.error('Bible initialization failed:', error);
            this.showErrorMessage('Failed to initialize Bible reader. Please refresh the page.');
        }
    }

    async loadBooks() {
        try {
            const response = await fetch('api/bible/books.php');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.books && Array.isArray(data.books)) {
                this.books = data.books;
                console.log('Loaded books:', this.books.length);
            } else {
                throw new Error('Invalid books data format');
            }
        } catch (error) {
            console.error('Error loading books:', error);
            this.books = [];
            throw error;
        }
    }

    setupEventListeners() {
        // Testament filter
        const testamentFilter = document.getElementById('testamentFilter');
        if (testamentFilter) {
            testamentFilter.addEventListener('change', (e) => {
                this.currentTestament = e.target.value;
                this.populateBookFilter();
            });
        }

        // Book select
        const bookSelect = document.getElementById('bookSelect');
        if (bookSelect) {
            bookSelect.addEventListener('change', (e) => {
                this.selectedBook = this.books.find(book => book.id == e.target.value);
                this.populateChapterFilter();
            });
        }

        // Load chapter button
        const loadChapterBtn = document.getElementById('loadChapter');
        if (loadChapterBtn) {
            loadChapterBtn.addEventListener('click', () => this.loadSelectedChapter());
        }

        // Search functionality
        const searchBtn = document.getElementById('searchBible');
        const searchInput = document.getElementById('bibleSearch');
        
        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => this.searchBible(searchInput.value));
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchBible(searchInput.value);
                }
            });
        }

        // Chapter select - allow direct loading when chapter is selected
        const chapterSelect = document.getElementById('chapterSelect');
        if (chapterSelect) {
            chapterSelect.addEventListener('change', () => {
                if (chapterSelect.value) {
                    this.loadSelectedChapter();
                }
            });
        }

        // Close any open highlight menu when clicking outside it
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.verse-item') && !e.target.closest('.highlight-menu')) {
                this.closeHighlightMenu();
            }
        });
    }

    closeHighlightMenu() {
        const menu = document.querySelector('.highlight-menu');
        if (menu) menu.remove();
    }

    populateTestamentFilter() {
        const testamentFilter = document.getElementById('testamentFilter');
        if (!testamentFilter) return;

        testamentFilter.innerHTML = `
            <option value="all">All Testaments</option>
            <option value="Old">Old Testament</option>
            <option value="New">New Testament</option>
        `;
    }

    populateBookFilter() {
        const bookSelect = document.getElementById('bookSelect');
        if (!bookSelect) return;

        // Filter books based on testament selection
        let filteredBooks = this.books;
        if (this.currentTestament !== 'all') {
            filteredBooks = this.books.filter(book => book.testament === this.currentTestament);
        }

        bookSelect.innerHTML = '<option value="">Select a Book</option>';
        
        filteredBooks.forEach(book => {
            const option = document.createElement('option');
            option.value = book.id;
            option.textContent = book.name;
            bookSelect.appendChild(option);
        });

        // Reset chapter filter
        this.populateChapterFilter();
    }

    populateChapterFilter() {
        const chapterSelect = document.getElementById('chapterSelect');
        const bookSelect = document.getElementById('bookSelect');
        
        if (!chapterSelect || !bookSelect) return;

        chapterSelect.innerHTML = '<option value="">Select Chapter</option>';
        
        const bookId = bookSelect.value;
        if (!bookId) return;

        const book = this.books.find(b => b.id == bookId);
        if (book && book.chapters) {
            for (let i = 1; i <= book.chapters; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `Chapter ${i}`;
                chapterSelect.appendChild(option);
            }
        }
    }

    async loadSelectedChapter() {
        const bookSelect = document.getElementById('bookSelect');
        const chapterSelect = document.getElementById('chapterSelect');
        
        const bookId = bookSelect.value;
        const chapter = chapterSelect.value;

        if (!bookId || !chapter) {
            this.showErrorMessage('Please select both a book and a chapter.');
            return;
        }

        await this.loadChapter(bookId, chapter);
    }

    async loadChapter(bookId, chapter) {
        try {
            this.showLoadingMessage();
            
            const response = await fetch(`api/bible/verses.php?book_id=${bookId}&chapter=${chapter}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();

            if (data.success && data.verses) {
                this.verses = data.verses;
                this.currentBookId = bookId;
                this.currentChapter = chapter;
                await this.loadHighlights(bookId, chapter);
                this.displayChapter();
            } else {
                throw new Error(data.message || 'Failed to load chapter');
            }
        } catch (error) {
            console.error('Error loading chapter:', error);
            this.showErrorMessage('Failed to load chapter. Please try again.');
        }
    }

    displayChapter() {
        const bibleContent = document.getElementById('bibleContent');
        if (!bibleContent) return;

        if (this.verses.length === 0) {
            bibleContent.innerHTML = `
                <div class="alert alert-info">
                    No verses found for this chapter.
                </div>
            `;
            return;
        }

        const bookName = this.verses[0].book_name;
        const chapterNumber = this.verses[0].chapter;

        let html = `
            <div class="chapter-header mb-4">
                <div class="d-flex justify-content-between align-items-center">
                    <h3 class="mb-0">${bookName} Chapter ${chapterNumber}</h3>
                    <div class="chapter-navigation">
                        <button class="btn btn-sm btn-outline-primary me-2" onclick="bible.navigateChapter(-1)">
                            <i class="fas fa-chevron-left"></i> Previous
                        </button>
                        <button class="btn btn-sm btn-outline-primary" onclick="bible.navigateChapter(1)">
                            Next <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
                <p class="text-muted highlight-hint mb-0"><i class="fas fa-highlighter"></i> Tap a verse to highlight it</p>
                <hr>
            </div>
            <div class="verses-container">
        `;

        this.verses.forEach(verse => {
            const color = this.highlights[verse.verse_number];
            const highlightClass = color ? ` highlight-${color}` : '';
            html += `
                <div class="verse-item${highlightClass}" data-verse-number="${verse.verse_number}" tabindex="0" role="button" aria-label="Verse ${verse.verse_number}, tap to highlight" onclick="bible.toggleHighlightMenu(this, ${verse.verse_number})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); bible.toggleHighlightMenu(this, ${verse.verse_number});}">
                    <sup class="verse-number">${verse.verse_number}</sup>
                    <span class="verse-text">${verse.text}</span>
                </div>
            `;
        });

        html += `</div>`;
        bibleContent.innerHTML = html;
    }

    navigateChapter(direction) {
        const chapterSelect = document.getElementById('chapterSelect');
        const bookSelect = document.getElementById('bookSelect');
        
        if (!chapterSelect || !bookSelect) return;

        const currentChapter = parseInt(chapterSelect.value);
        const bookId = bookSelect.value;
        
        if (!bookId || !currentChapter) return;

        const book = this.books.find(b => b.id == bookId);
        if (!book) return;

        const newChapter = currentChapter + direction;
        
        // Check if new chapter is within valid range
        if (newChapter >= 1 && newChapter <= book.chapters) {
            chapterSelect.value = newChapter;
            this.loadChapter(bookId, newChapter);
        }
    }

    async searchBible(query) {
        if (!query || query.trim().length < 2) {
            this.showWelcomeMessage();
            return;
        }

        try {
            this.showLoadingMessage('Searching...');
            
            const response = await fetch(`api/bible/verses.php?search=${encodeURIComponent(query.trim())}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.displaySearchResults(data.verses || [], query);
        } catch (error) {
            console.error('Search error:', error);
            this.showErrorMessage('Search failed. Please try again.');
        }
    }

    displaySearchResults(verses, query) {
        const bibleContent = document.getElementById('bibleContent');
        if (!bibleContent) return;

        if (verses.length === 0) {
            bibleContent.innerHTML = `
                <div class="alert alert-info">
                    No results found for "${query}"
                </div>
            `;
            return;
        }

        // Cap how many verses we render - hundreds of results in one long
        // page isn't "easy to navigate". Ask for a more specific search instead.
        const resultsLimit = 50;
        const shownVerses = verses.slice(0, resultsLimit);
        const moreNote = verses.length > resultsLimit
            ? `<p class="text-muted">Showing the first ${resultsLimit} of ${verses.length} matches. Try a more specific word or phrase to narrow this down.</p>`
            : '';

        let html = `
            <div class="search-results-header mb-4">
                <h3>Search Results for "${query}"</h3>
                <p class="text-muted">Found ${verses.length} verse(s)</p>
                ${moreNote}
                <hr>
            </div>
            <div class="search-results">
        `;

        // Group verses by book and chapter
        const groupedVerses = this.groupVersesByBookChapter(shownVerses);

        Object.keys(groupedVerses).forEach(groupKey => {
            const [bookName, chapter] = groupKey.split('-');
            html += `
                <div class="search-result-group mb-4">
                    <h5 class="text-primary">${bookName} Chapter ${chapter}</h5>
            `;

            groupedVerses[groupKey].forEach(verse => {
                const highlightedText = this.highlightText(verse.text, query);
                html += `
                    <div class="search-verse-item mb-2">
                        <sup class="verse-number">${verse.verse_number}</sup>
                        <span class="verse-text">${highlightedText}</span>
                    </div>
                `;
            });

            html += `</div>`;
        });

        html += `</div>`;
        bibleContent.innerHTML = html;
    }

    groupVersesByBookChapter(verses) {
        return verses.reduce((groups, verse) => {
            const key = `${verse.book_name}-${verse.chapter}`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(verse);
            return groups;
        }, {});
    }

    highlightText(text, query) {
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark class="bg-warning">$1</mark>');
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    showWelcomeMessage() {
        const bibleContent = document.getElementById('bibleContent');
        if (bibleContent) {
            bibleContent.innerHTML = `
                <div class="welcome-message text-center py-5">
                    <i class="fas fa-bible fa-3x mb-3"></i>
                    <h3>Welcome to the Bible Reader</h3>
                    <p class="text-muted">Choose a book and chapter above to start reading, or search for a word to find verses.</p>
                </div>
            `;
        }
    }

    showLoadingMessage(message = 'Loading...') {
        const bibleContent = document.getElementById('bibleContent');
        if (bibleContent) {
            bibleContent.innerHTML = `
                <div class="loading-message text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-3">${message}</p>
                </div>
            `;
        }
    }

    showErrorMessage(message) {
        const bibleContent = document.getElementById('bibleContent');
        if (bibleContent) {
            bibleContent.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i> ${message}
                </div>
            `;
        }
    }

    async loadHighlights(bookId, chapter) {
        this.highlights = {};
        try {
            const data = await AuthHelper.apiCall(`bible/highlights.php?book_id=${bookId}&chapter=${chapter}`);
            if (data.success && data.highlights) {
                data.highlights.forEach(h => {
                    this.highlights[h.verse_number] = h.color;
                });
            }
        } catch (error) {
            console.error('Error loading highlights:', error);
        }
    }

    // Shows a small popup of color swatches (plus a remove option for
    // already-highlighted verses) anchored to the tapped verse. Appended to
    // <body> with fixed positioning so it always renders above surrounding
    // verses regardless of stacking context.
    toggleHighlightMenu(verseEl, verseNumber) {
        const existingMenu = document.querySelector('.highlight-menu');
        const wasOpenForThisVerse = existingMenu && existingMenu.dataset.verseNumber === String(verseNumber);
        this.closeHighlightMenu();

        if (wasOpenForThisVerse) {
            return;
        }

        const currentColor = this.highlights[verseNumber];

        const menu = document.createElement('div');
        menu.className = 'highlight-menu';
        menu.dataset.verseNumber = String(verseNumber);
        menu.addEventListener('click', e => e.stopPropagation());

        let swatchesHtml = this.highlightColors.map(color => `
            <button type="button" class="highlight-swatch highlight-swatch-${color} ${currentColor === color ? 'active' : ''}" data-color="${color}" aria-label="${color} highlight" title="${color.charAt(0).toUpperCase() + color.slice(1)} highlight"></button>
        `).join('');

        if (currentColor) {
            swatchesHtml += `
                <button type="button" class="highlight-swatch highlight-swatch-remove" data-color="" aria-label="Remove highlight" title="Remove highlight">
                    <i class="fas fa-times"></i>
                </button>
            `;
        }

        menu.innerHTML = `
            <span class="highlight-menu-label">Highlight</span>
            <div class="highlight-swatches">${swatchesHtml}</div>
        `;

        menu.querySelectorAll('.highlight-swatch').forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                if (color) {
                    this.saveHighlight(verseEl, verseNumber, color);
                } else {
                    this.removeHighlight(verseEl, verseNumber);
                }
                this.closeHighlightMenu();
            });
        });

        document.body.appendChild(menu);

        // Position in document coordinates so the menu scrolls naturally
        // with the page instead of drifting away from its verse.
        const rect = verseEl.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
        menu.style.left = `${rect.left + window.scrollX}px`;

        // Keep the menu within the viewport horizontally
        const menuRect = menu.getBoundingClientRect();
        if (menuRect.right > window.innerWidth) {
            menu.style.left = `${Math.max(8, window.innerWidth + window.scrollX - menuRect.width - 8)}px`;
        }
    }

    async saveHighlight(verseEl, verseNumber, color) {
        try {
            await AuthHelper.apiCall('bible/highlights.php', 'POST', {
                book_id: this.currentBookId,
                chapter: this.currentChapter,
                verse_number: verseNumber,
                color: color
            });
            this.highlights[verseNumber] = color;
            this.setVerseHighlightClass(verseEl, color);
        } catch (error) {
            console.error('Error saving highlight:', error);
        }
    }

    async removeHighlight(verseEl, verseNumber) {
        try {
            await AuthHelper.apiCall(`bible/highlights.php?book_id=${this.currentBookId}&chapter=${this.currentChapter}&verse_number=${verseNumber}`, 'DELETE');
            delete this.highlights[verseNumber];
            this.setVerseHighlightClass(verseEl, null);
        } catch (error) {
            console.error('Error removing highlight:', error);
        }
    }

    setVerseHighlightClass(verseEl, color) {
        this.highlightColors.forEach(c => verseEl.classList.remove(`highlight-${c}`));
        if (color) {
            verseEl.classList.add(`highlight-${color}`);
        }
    }
}

// Initialize Bible when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.bible = new Bible();
});