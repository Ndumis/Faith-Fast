// Shared rich-text editor utilities used by Journal, Prayers, Resources,
// Fasting and Groups for any field that uses the formatting toolbar +
// contenteditable pattern (.richtext-toolbar + .richtext-content).
const RichTextEditor = {
    allowedTags: new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'DIV', 'P', 'SPAN']),
    removeEntirely: new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'NOSCRIPT', 'SVG', 'LINK', 'META']),

    // Whitelist-based HTML sanitizer: keeps basic text formatting/list markup
    // from the editor, strips everything else (scripts, attributes, embeds, etc.)
    sanitizeHtml(html) {
        const container = document.createElement('div');
        container.innerHTML = html;

        const clean = (node) => {
            let child = node.firstChild;
            while (child) {
                if (child.nodeType === Node.ELEMENT_NODE) {
                    const tag = child.tagName.toUpperCase();
                    if (this.allowedTags.has(tag)) {
                        Array.from(child.attributes).forEach(attr => child.removeAttribute(attr.name));
                        clean(child);
                        child = child.nextSibling;
                    } else if (this.removeEntirely.has(tag)) {
                        const next = child.nextSibling;
                        node.removeChild(child);
                        child = next;
                    } else {
                        const firstMoved = child.firstChild;
                        const next = child.nextSibling;
                        while (child.firstChild) {
                            node.insertBefore(child.firstChild, child);
                        }
                        node.removeChild(child);
                        child = firstMoved || next;
                    }
                } else if (child.nodeType === Node.TEXT_NODE) {
                    child = child.nextSibling;
                } else {
                    const next = child.nextSibling;
                    node.removeChild(child);
                    child = next;
                }
            }
        };

        clean(container);
        return container.innerHTML;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    stripHtml(html) {
        const withBreaks = html
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<\/(div|p|li)>/gi, ' ');
        const div = document.createElement('div');
        div.innerHTML = withBreaks;
        return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
    },

    // Convert stored content to safe HTML for display/editing. Legacy content
    // is plain text (no tags), new content is HTML produced by the editor.
    contentToHtml(content) {
        if (!content) return '';
        if (/<[a-z][\s\S]*>/i.test(content)) {
            return this.sanitizeHtml(content);
        }
        return this.escapeHtml(content).replace(/\n/g, '<br>');
    },

    // Plain-text representation of stored content, whether it's legacy plain
    // text (with \n newlines) or rich HTML from the editor
    getPlainText(content) {
        if (!content) return '';
        return this.stripHtml(this.contentToHtml(content));
    },

    // Truncate rich HTML to roughly maxLength visible characters while
    // preserving formatting (bold/italic/lists) so previews still look
    // like the content the user wrote
    truncateHtml(html, maxLength) {
        const container = document.createElement('div');
        container.innerHTML = html;
        let remaining = maxLength;

        const walk = (node) => {
            Array.from(node.childNodes).forEach(child => {
                if (remaining <= 0) {
                    node.removeChild(child);
                    return;
                }
                if (child.nodeType === Node.TEXT_NODE) {
                    const text = child.textContent;
                    if (text.length > remaining) {
                        child.textContent = text.substring(0, remaining);
                        remaining = 0;
                    } else {
                        remaining -= text.length;
                    }
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    walk(child);
                    if (child.childNodes.length === 0 && child.tagName !== 'BR') {
                        node.removeChild(child);
                    }
                }
            });
        };

        walk(container);
        return container.innerHTML;
    },

    // Wire up a formatting toolbar to its contenteditable field. Re-binding
    // is safe to call repeatedly (e.g. when a tab is re-initialized) since
    // both the toolbar buttons and the field are cloned to drop old listeners.
    // Returns the (possibly replaced) content element.
    bindToolbar(toolbar, content) {
        if (!toolbar || !content) return content;

        toolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        const contentInput = content.cloneNode(true);
        content.replaceWith(contentInput);

        toolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                contentInput.focus();
                document.execCommand(btn.dataset.command, false, null);
                this.updateToolbarState(toolbar);
            });
        });

        contentInput.addEventListener('keyup', () => this.updateToolbarState(toolbar));
        contentInput.addEventListener('mouseup', () => this.updateToolbarState(toolbar));
        contentInput.addEventListener('focus', () => this.updateToolbarState(toolbar));

        // Paste as plain text so formatting always comes from the toolbar
        contentInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            document.execCommand('insertText', false, text);
        });

        // Let the placeholder reappear once the editor is fully cleared
        contentInput.addEventListener('input', () => {
            if (contentInput.innerText.trim() === '' && !contentInput.querySelector('img, table')) {
                contentInput.innerHTML = '';
            }
        });

        return contentInput;
    },

    updateToolbarState(toolbar) {
        const stateCommands = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'];
        toolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
            const command = btn.dataset.command;
            if (!stateCommands.includes(command)) return;
            try {
                btn.classList.toggle('active', document.queryCommandState(command));
            } catch (e) {
                // queryCommandState isn't guaranteed everywhere - ignore
            }
        });
    },

    // Bind every .richtext-toolbar + .richtext-content pair within a
    // container (e.g. a freshly-rendered modal or form). Returns a map of
    // element id -> bound content element for fields that have an id.
    bindAll(container = document) {
        const bound = {};
        container.querySelectorAll('.richtext-toolbar').forEach(toolbar => {
            const content = toolbar.nextElementSibling;
            if (content && content.classList.contains('richtext-content')) {
                const boundContent = this.bindToolbar(toolbar, content);
                if (boundContent.id) bound[boundContent.id] = boundContent;
            }
        });
        return bound;
    }
};
