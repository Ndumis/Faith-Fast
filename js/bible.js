// bible.js - Fixed and improved version
class Bible {
    constructor() {
        this.books = [];
        this.selectedBook = null;
        this.selectedChapter = null;
        this.verses = [];
        this.currentTestament = 'all';
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
                <hr>
            </div>
            <div class="verses-container">
        `;

        this.verses.forEach(verse => {
            html += `
                <div class="verse-item mb-3">
                    <sup class="verse-number badge bg-light text-dark">${verse.verse_number}</sup>
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

        let html = `
            <div class="search-results-header mb-4">
                <h3>Search Results for "${query}"</h3>
                <p class="text-muted">Found ${verses.length} verse(s)</p>
                <hr>
            </div>
            <div class="search-results">
        `;

        // Group verses by book and chapter
        const groupedVerses = this.groupVersesByBookChapter(verses);

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
                    <h3>Welcome to the Bible Reader</h3>
                    <p class="text-muted">Select a testament, book, and chapter to start reading God's Word.</p>
                    <div class="mt-4">
                        <i class="fas fa-bible fa-3x text-muted"></i>
                    </div>
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
}

// Initialize Bible when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.bible = new Bible();
});