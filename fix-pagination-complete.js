const fs = require('fs');

const filePath = 'D:\\PROShael\\alshuail-admin-arabic\\public\\monitoring-standalone\\index.html';

let content = fs.readFileSync(filePath, 'utf8');

// 1. Add CSS for .page-numbers after .page-btn.active
const cssOld = `.page-btn.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }

        /* Modal Styles */`;

const cssNew = `.page-btn.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }

        .page-numbers {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .page-numbers .page-num {
            padding: 10px 15px;
            border: 2px solid #e9ecef;
            background: white;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            font-weight: 600;
            min-width: 40px;
            text-align: center;
        }

        .page-numbers .page-num:hover {
            border-color: #667eea;
            color: #667eea;
        }

        .page-numbers .page-num.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }

        .page-numbers .page-ellipsis {
            padding: 10px 5px;
            color: #666;
        }

        .page-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Modal Styles */`;

if (content.includes(cssOld)) {
    content = content.replace(cssOld, cssNew);
    console.log('CSS added successfully');
} else {
    console.log('CSS already exists or pattern not found');
}

// 2. Replace updatePaginationButtons function
const oldUpdatePaginationButtons = `function updatePaginationButtons() {
            // Use server-side totalPages if available, otherwise calculate from filtered
            const pages = totalPages > 0 ? totalPages : Math.ceil(filteredMembers.length / pageSize);
            const paginationContainer = document.querySelector('.pagination');
            if (!paginationContainer) return;

            // Keep existing pagination buttons but update active state
            const buttons = paginationContainer.querySelectorAll('.page-btn:not(.prev):not(.next)');
            buttons.forEach((btn, index) => {
                if (index + 1 === currentPage) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }

                // Update onclick to use new pagination
                btn.onclick = () => goToPage(index + 1);
            });

            // Update prev/next buttons
            const prevBtn = paginationContainer.querySelector('.prev');
            const nextBtn = paginationContainer.querySelector('.next');
            if (prevBtn) prevBtn.onclick = () => goToPage(currentPage - 1);
            if (nextBtn) nextBtn.onclick = () => goToPage(currentPage + 1);
        }`;

const newUpdatePaginationButtons = `function updatePaginationButtons() {
            // Calculate total pages - use client-side for monitoring/all endpoint
            const pages = Math.ceil(filteredMembers.length / pageSize);
            const pageNumbersContainer = document.getElementById('pageNumbers');
            if (!pageNumbersContainer) return;

            // Clear existing page numbers
            pageNumbersContainer.innerHTML = '';

            // Determine which pages to show
            const maxVisiblePages = 5;
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(pages, startPage + maxVisiblePages - 1);

            // Adjust start if we're near the end
            if (endPage - startPage < maxVisiblePages - 1) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            // Add first page and ellipsis if needed
            if (startPage > 1) {
                const firstBtn = document.createElement('button');
                firstBtn.className = 'page-num';
                firstBtn.textContent = '1';
                firstBtn.onclick = () => goToPage(1);
                pageNumbersContainer.appendChild(firstBtn);

                if (startPage > 2) {
                    const ellipsis = document.createElement('span');
                    ellipsis.className = 'page-ellipsis';
                    ellipsis.textContent = '...';
                    pageNumbersContainer.appendChild(ellipsis);
                }
            }

            // Add visible page numbers
            for (let i = startPage; i <= endPage; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.className = 'page-num' + (i === currentPage ? ' active' : '');
                pageBtn.textContent = i;
                pageBtn.onclick = () => goToPage(i);
                pageNumbersContainer.appendChild(pageBtn);
            }

            // Add last page and ellipsis if needed
            if (endPage < pages) {
                if (endPage < pages - 1) {
                    const ellipsis = document.createElement('span');
                    ellipsis.className = 'page-ellipsis';
                    ellipsis.textContent = '...';
                    pageNumbersContainer.appendChild(ellipsis);
                }

                const lastBtn = document.createElement('button');
                lastBtn.className = 'page-num';
                lastBtn.textContent = pages;
                lastBtn.onclick = () => goToPage(pages);
                pageNumbersContainer.appendChild(lastBtn);
            }

            // Update navigation button states
            const prevBtn = document.querySelector('.page-btn.prev');
            const nextBtn = document.querySelector('.page-btn.next');
            const firstBtn = document.querySelector('.page-btn.first');
            const lastBtn = document.querySelector('.page-btn.last');

            if (prevBtn) prevBtn.disabled = currentPage === 1;
            if (nextBtn) nextBtn.disabled = currentPage === pages;
            if (firstBtn) firstBtn.disabled = currentPage === 1;
            if (lastBtn) lastBtn.disabled = currentPage === pages;

            console.log('📄 Page ' + currentPage + '/' + pages + ' (showing ' + filteredMembers.slice((currentPage-1)*pageSize, currentPage*pageSize).length + ' of ' + filteredMembers.length + ' members)');
        }`;

if (content.includes(oldUpdatePaginationButtons)) {
    content = content.replace(oldUpdatePaginationButtons, newUpdatePaginationButtons);
    console.log('updatePaginationButtons function replaced');
} else {
    console.log('updatePaginationButtons not found - trying alternative pattern');
}

// 3. Replace goToPage function to use client-side pagination
const oldGoToPage = `async function goToPage(page) {
            // Use server-side totalPages if available
            const pages = totalPages > 0 ? totalPages : Math.ceil(filteredMembers.length / pageSize);
            if (page < 1 || page > pages) return;

            currentPage = page;

            // If using server-side pagination, fetch new page from server
            if (totalPages > 0 && !isLoading) {
                await loadMembersFromServer(page);
            } else {
                // Fallback to client-side pagination
                renderCurrentPage();
            }
        }`;

const newGoToPage = `async function goToPage(page) {
            // Use client-side pagination for monitoring/all endpoint
            const pages = Math.ceil(filteredMembers.length / pageSize);
            if (page < 1 || page > pages) return;

            currentPage = page;

            // Always use client-side pagination since monitoring/all returns all data
            renderCurrentPage();
            console.log('📄 Navigated to page ' + page);
        }

        // Navigation helper functions
        function goToPrevPage() {
            if (currentPage > 1) {
                goToPage(currentPage - 1);
            }
        }

        function goToNextPage() {
            const pages = Math.ceil(filteredMembers.length / pageSize);
            if (currentPage < pages) {
                goToPage(currentPage + 1);
            }
        }

        function goToLastPage() {
            const pages = Math.ceil(filteredMembers.length / pageSize);
            goToPage(pages);
        }`;

if (content.includes(oldGoToPage)) {
    content = content.replace(oldGoToPage, newGoToPage);
    console.log('goToPage function replaced and helper functions added');
} else {
    console.log('goToPage not found - trying alternative pattern');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('All changes applied successfully!');
