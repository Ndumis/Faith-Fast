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
        this.activeHighlightMenuType = null;
        this.selectionDebounceTimer = null;
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

        // Detect text selected (mouse drag or touch drag) inside a verse and
        // offer to highlight it. Debounced so we react once the selection
        // has settled rather than on every intermediate change.
        document.addEventListener('selectionchange', () => {
            clearTimeout(this.selectionDebounceTimer);
            this.selectionDebounceTimer = setTimeout(() => this.handleSelectionChange(), 250);
        });

        // Switch between the chapter reader and the "My Highlights" summary
        const readViewBtn = document.getElementById('bibleReadViewBtn');
        const highlightsViewBtn = document.getElementById('bibleHighlightsViewBtn');
        if (readViewBtn) readViewBtn.addEventListener('click', () => this.showReadView());
        if (highlightsViewBtn) highlightsViewBtn.addEventListener('click', () => this.showHighlightsView());
    }

    closeHighlightMenu() {
        const menu = document.querySelector('.highlight-menu');
        if (menu) menu.remove();
        this.activeHighlightMenuType = null;
    }

    populateTestamentFilter() {
        const testamentFilter = document.getElementById('testamentFilter');
        if (!testamentFilter) return;

        testamentFilter.innerHTML = `
            <option value="all">All Testaments</option>
            <option value="Old Testament">Old Testament</option>
            <option value="New Testament">New Testament</option>
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
                <p class="text-muted highlight-hint mb-0"><i class="fas fa-highlighter"></i> Select (or drag across) the words you want to highlight</p>
                <hr>
            </div>
            <div class="verses-container">
        `;

        this.verses.forEach(verse => {
            html += `
                <div class="verse-item" data-verse-number="${verse.verse_number}">
                    <sup class="verse-number">${verse.verse_number}</sup>
                    <span class="verse-text">${this.renderVerseText(verse.text, this.highlights[verse.verse_number], verse.verse_number)}</span>
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
                    const key = h.verse_number;
                    if (!this.highlights[key]) this.highlights[key] = [];
                    this.highlights[key].push({
                        id: h.id,
                        start_offset: parseInt(h.start_offset, 10),
                        end_offset: parseInt(h.end_offset, 10),
                        color: h.color
                    });
                });
            }
        } catch (error) {
            console.error('Error loading highlights:', error);
        }
    }

    // Renders a verse's text with any saved highlight ranges wrapped in
    // <span class="text-highlight"> elements, escaping the rest as plain text.
    renderVerseText(text, highlights, verseNumber) {
        if (!highlights || highlights.length === 0) {
            return this.escapeHtml(text);
        }

        const sorted = [...highlights].sort((a, b) => a.start_offset - b.start_offset);
        let html = '';
        let pos = 0;

        sorted.forEach(h => {
            const start = Math.max(pos, Math.min(h.start_offset, text.length));
            const end = Math.max(start, Math.min(h.end_offset, text.length));

            if (start > pos) {
                html += this.escapeHtml(text.slice(pos, start));
            }
            if (end > start) {
                html += `<span class="text-highlight highlight-${h.color}" data-highlight-id="${h.id}" onclick="bible.manageHighlight(event, this, ${verseNumber}, ${h.id})">${this.escapeHtml(text.slice(start, end))}</span>`;
                pos = end;
            }
        });

        if (pos < text.length) {
            html += this.escapeHtml(text.slice(pos));
        }

        return html;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Re-renders a single verse's text in place (used after saving/removing
    // a highlight) so scroll position and other verses are undisturbed.
    renderVerse(verseNumber) {
        const verse = this.verses.find(v => v.verse_number == verseNumber);
        const verseItem = document.querySelector(`.verse-item[data-verse-number="${verseNumber}"]`);
        if (!verse || !verseItem) return;

        const textEl = verseItem.querySelector('.verse-text');
        if (textEl) {
            textEl.innerHTML = this.renderVerseText(verse.text, this.highlights[verseNumber], verseNumber);
        }
    }

    // Walks the text nodes under `root` to translate a Range boundary
    // (container + offset) into a single character offset within the
    // verse's full text content.
    getTextOffset(root, container, offset) {
        if (container.nodeType === Node.TEXT_NODE) {
            let total = 0;
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
            let node;
            while ((node = walker.nextNode())) {
                if (node === container) {
                    return total + offset;
                }
                total += node.textContent.length;
            }
            return total;
        }

        // Boundary fell on an element node - sum the text of its preceding children.
        let total = 0;
        for (let i = 0; i < offset && i < container.childNodes.length; i++) {
            total += container.childNodes[i].textContent.length;
        }
        return total;
    }

    // Reacts to the user selecting (dragging across) text inside a verse and
    // offers to highlight it.
    handleSelectionChange() {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed || selection.toString().trim() === '') {
            if (this.activeHighlightMenuType === 'selection') {
                this.closeHighlightMenu();
            }
            return;
        }

        const anchorEl = selection.anchorNode.nodeType === Node.TEXT_NODE ? selection.anchorNode.parentElement : selection.anchorNode;
        const focusEl = selection.focusNode.nodeType === Node.TEXT_NODE ? selection.focusNode.parentElement : selection.focusNode;

        const verseTextEl = anchorEl && anchorEl.closest && anchorEl.closest('.verse-text');
        const focusVerseTextEl = focusEl && focusEl.closest && focusEl.closest('.verse-text');

        // Only support highlighting within a single verse at a time.
        if (!verseTextEl || verseTextEl !== focusVerseTextEl) {
            return;
        }

        const verseItem = verseTextEl.closest('.verse-item');
        if (!verseItem) return;

        const verseNumber = verseItem.dataset.verseNumber;
        const range = selection.getRangeAt(0);

        let start = this.getTextOffset(verseTextEl, range.startContainer, range.startOffset);
        let end = this.getTextOffset(verseTextEl, range.endContainer, range.endOffset);
        if (start > end) {
            [start, end] = [end, start];
        }
        if (start === end) return;

        this.showSelectionMenu(verseTextEl, verseNumber, start, end, range);
    }

    // Shows a color picker anchored to a fresh text selection, offering to
    // save it as a new highlight.
    showSelectionMenu(verseTextEl, verseNumber, start, end, range) {
        this.closeHighlightMenu();

        const menu = document.createElement('div');
        menu.className = 'highlight-menu';
        menu.addEventListener('click', e => e.stopPropagation());
        // Prevent the browser from collapsing the selection before the
        // swatch's click handler runs.
        menu.addEventListener('mousedown', e => e.preventDefault());

        const swatchesHtml = this.highlightColors.map(color => `
            <button type="button" class="highlight-swatch highlight-swatch-${color}" data-color="${color}" aria-label="${color} highlight" title="${color.charAt(0).toUpperCase() + color.slice(1)} highlight"></button>
        `).join('');

        menu.innerHTML = `
            <span class="highlight-menu-label">Highlight</span>
            <div class="highlight-swatches">${swatchesHtml}</div>
        `;

        menu.querySelectorAll('.highlight-swatch').forEach(btn => {
            btn.addEventListener('click', () => {
                this.saveHighlight(verseNumber, start, end, btn.dataset.color);
                this.closeHighlightMenu();
                window.getSelection().removeAllRanges();
            });
        });

        document.body.appendChild(menu);
        this.activeHighlightMenuType = 'selection';
        this.positionMenu(menu, range.getClientRects());
    }

    // Shows a color picker (with a remove option) for an existing highlight
    // span that was tapped/clicked.
    manageHighlight(event, spanEl, verseNumber, highlightId) {
        event.stopPropagation();

        const existingMenu = document.querySelector('.highlight-menu');
        const wasOpenForThis = existingMenu && existingMenu.dataset.highlightId === String(highlightId);
        this.closeHighlightMenu();
        if (wasOpenForThis) return;

        const highlight = (this.highlights[verseNumber] || []).find(h => h.id === highlightId);
        const currentColor = highlight ? highlight.color : null;

        const menu = document.createElement('div');
        menu.className = 'highlight-menu';
        menu.dataset.highlightId = String(highlightId);
        menu.addEventListener('click', e => e.stopPropagation());

        let swatchesHtml = this.highlightColors.map(color => `
            <button type="button" class="highlight-swatch highlight-swatch-${color} ${currentColor === color ? 'active' : ''}" data-color="${color}" aria-label="${color} highlight" title="${color.charAt(0).toUpperCase() + color.slice(1)} highlight"></button>
        `).join('');

        swatchesHtml += `
            <button type="button" class="highlight-swatch highlight-swatch-remove" data-color="" aria-label="Remove highlight" title="Remove highlight">
                <i class="fas fa-times"></i>
            </button>
        `;

        menu.innerHTML = `
            <span class="highlight-menu-label">Highlight</span>
            <div class="highlight-swatches">${swatchesHtml}</div>
        `;

        menu.querySelectorAll('.highlight-swatch').forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                if (color && highlight) {
                    this.saveHighlight(verseNumber, highlight.start_offset, highlight.end_offset, color);
                } else if (!color) {
                    this.removeHighlight(verseNumber, highlightId);
                }
                this.closeHighlightMenu();
            });
        });

        document.body.appendChild(menu);
        this.activeHighlightMenuType = 'manage';
        this.positionMenu(menu, [spanEl.getBoundingClientRect()]);
    }

    // Positions a highlight menu in document coordinates, near the end of
    // the given client rects, keeping it within the viewport horizontally.
    positionMenu(menu, clientRects) {
        const rects = clientRects && clientRects.length ? clientRects : [menu.getBoundingClientRect()];
        const rect = rects[rects.length - 1];

        menu.style.top = `${rect.bottom + window.scrollY + 8}px`;
        menu.style.left = `${rect.left + window.scrollX}px`;

        const menuRect = menu.getBoundingClientRect();
        if (menuRect.right > window.innerWidth) {
            menu.style.left = `${Math.max(8, window.innerWidth + window.scrollX - menuRect.width - 8)}px`;
        }
    }

    async saveHighlight(verseNumber, start, end, color) {
        try {
            const data = await AuthHelper.apiCall('bible/highlights.php', 'POST', {
                book_id: this.currentBookId,
                chapter: this.currentChapter,
                verse_number: verseNumber,
                start_offset: start,
                end_offset: end,
                color: color
            });
            if (data.success) {
                this.highlights[verseNumber] = (data.highlights || []).map(h => ({
                    id: h.id,
                    start_offset: parseInt(h.start_offset, 10),
                    end_offset: parseInt(h.end_offset, 10),
                    color: h.color
                }));
                this.renderVerse(verseNumber);
            }
        } catch (error) {
            console.error('Error saving highlight:', error);
        }
    }

    async removeHighlight(verseNumber, highlightId) {
        try {
            await AuthHelper.apiCall(`bible/highlights.php?id=${highlightId}`, 'DELETE');
            this.highlights[verseNumber] = (this.highlights[verseNumber] || []).filter(h => h.id !== highlightId);
            this.renderVerse(verseNumber);
        } catch (error) {
            console.error('Error removing highlight:', error);
        }
    }

    showReadView() {
        document.getElementById('bibleReadView')?.classList.remove('d-none');
        document.getElementById('bibleHighlightsView')?.classList.add('d-none');
        document.getElementById('bibleReadViewBtn')?.classList.add('active');
        document.getElementById('bibleHighlightsViewBtn')?.classList.remove('active');
    }

    async showHighlightsView() {
        document.getElementById('bibleReadView')?.classList.add('d-none');
        document.getElementById('bibleHighlightsView')?.classList.remove('d-none');
        document.getElementById('bibleHighlightsViewBtn')?.classList.add('active');
        document.getElementById('bibleReadViewBtn')?.classList.remove('active');

        const container = document.getElementById('bibleHighlightsContent');
        if (container) {
            container.innerHTML = `
                <div class="loading-message text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
        }

        const highlights = await this.loadMyHighlights();
        this.displayMyHighlights(highlights);
    }

    async loadMyHighlights() {
        try {
            const data = await AuthHelper.apiCall('bible/highlights.php');
            return (data.success && data.highlights) ? data.highlights : [];
        } catch (error) {
            console.error('Error loading my highlights:', error);
            return [];
        }
    }

    // Renders the "My Highlights" list - each saved highlight shown in its
    // surrounding verse text, with shortcuts to jump back to that passage.
    displayMyHighlights(highlights) {
        const container = document.getElementById('bibleHighlightsContent');
        if (!container) return;

        if (!highlights || highlights.length === 0) {
            container.innerHTML = `
                <div class="empty-state text-center py-5">
                    <i class="fas fa-highlighter fa-3x mb-3 text-muted"></i>
                    <h4>No highlights yet</h4>
                    <p class="text-muted">While reading, select or drag across the words you want to remember - they'll show up here as a quick way back to your favorite passages.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = highlights.map(h => {
            const text = h.verse_text || '';
            const start = Math.max(0, Math.min(parseInt(h.start_offset, 10), text.length));
            const end = Math.max(start, Math.min(parseInt(h.end_offset, 10), text.length));
            const snippet = `${this.escapeHtml(text.slice(0, start))}<span class="text-highlight highlight-${h.color}">${this.escapeHtml(text.slice(start, end))}</span>${this.escapeHtml(text.slice(end))}`;

            return `
                <div class="highlight-card">
                    <div class="highlight-card-body">
                        <div class="highlight-reference">${this.escapeHtml(h.book_name)} ${h.chapter}:${h.verse_number}</div>
                        <p class="highlight-snippet">${snippet}</p>
                    </div>
                    <div class="highlight-card-actions">
                        <button type="button" class="btn btn-sm btn-outline-primary go-to-highlight" data-book-id="${h.book_id}" data-chapter="${h.chapter}" data-verse="${h.verse_number}">
                            <i class="fas fa-book-open"></i> Read in context
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger remove-highlight-card" data-highlight-id="${h.id}" data-verse="${h.verse_number}" aria-label="Remove highlight">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.go-to-highlight').forEach(btn => {
            btn.addEventListener('click', () => {
                this.goToVerse(btn.dataset.bookId, parseInt(btn.dataset.chapter, 10), parseInt(btn.dataset.verse, 10));
            });
        });

        container.querySelectorAll('.remove-highlight-card').forEach(btn => {
            btn.addEventListener('click', async () => {
                await this.removeHighlight(parseInt(btn.dataset.verse, 10), parseInt(btn.dataset.highlightId, 10));
                const card = btn.closest('.highlight-card');
                if (card) card.remove();
                if (!container.querySelector('.highlight-card')) {
                    this.displayMyHighlights([]);
                }
            });
        });
    }

    // Switches to the Read view, loads the given chapter, and scrolls to/
    // briefly highlights the target verse.
    async goToVerse(bookId, chapter, verseNumber) {
        this.currentTestament = 'all';
        const testamentFilter = document.getElementById('testamentFilter');
        if (testamentFilter) testamentFilter.value = 'all';
        this.populateBookFilter();

        const bookSelect = document.getElementById('bookSelect');
        const chapterSelect = document.getElementById('chapterSelect');
        if (bookSelect) bookSelect.value = bookId;
        this.selectedBook = this.books.find(b => b.id == bookId);
        this.populateChapterFilter();
        if (chapterSelect) chapterSelect.value = chapter;

        this.showReadView();
        await this.loadChapter(bookId, chapter);

        setTimeout(() => {
            const verseEl = document.querySelector(`.verse-item[data-verse-number="${verseNumber}"]`);
            if (verseEl) {
                verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                verseEl.classList.add('verse-flash');
                setTimeout(() => verseEl.classList.remove('verse-flash'), 2000);
            }
        }, 100);
    }
}

// Initialize Bible when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.bible = new Bible();
});