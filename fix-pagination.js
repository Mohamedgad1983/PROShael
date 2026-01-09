const fs = require('fs');
const path = require('path');

const filePath = 'D:\\PROShael\\alshuail-admin-arabic\\public\\monitoring-standalone\\index.html';

let content = fs.readFileSync(filePath, 'utf8');

// Replace the pagination HTML
const oldPattern = /<button class="page-btn"><i class="fas fa-angle-double-right"><\/i><\/button>\s*<button class="page-btn"><i class="fas fa-angle-right"><\/i><\/button>\s*<button class="page-btn active">1<\/button>\s*<button class="page-btn">2<\/button>\s*<button class="page-btn">3<\/button>\s*<button class="page-btn">4<\/button>\s*<button class="page-btn">5<\/button>\s*<button class="page-btn"><i class="fas fa-angle-left"><\/i><\/button>\s*<button class="page-btn"><i class="fas fa-angle-double-left"><\/i><\/button>/;

const newHTML = `<button class="page-btn first" onclick="goToPage(1)" title="الصفحة الأولى"><i class="fas fa-angle-double-right"></i></button>
                <button class="page-btn prev" onclick="goToPrevPage()" title="السابق"><i class="fas fa-angle-right"></i></button>
                <div class="page-numbers" id="pageNumbers"></div>
                <button class="page-btn next" onclick="goToNextPage()" title="التالي"><i class="fas fa-angle-left"></i></button>
                <button class="page-btn last" onclick="goToLastPage()" title="الصفحة الأخيرة"><i class="fas fa-angle-double-left"></i></button>`;

if (oldPattern.test(content)) {
    content = content.replace(oldPattern, newHTML);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Pagination HTML updated successfully!');
} else {
    console.log('Pattern not found - let me try a simpler approach');

    // Try simpler replacement
    const simpleOld = '<button class="page-btn active">1</button>';
    if (content.includes(simpleOld)) {
        console.log('Found pagination buttons - using line-by-line replacement');

        // Read all lines
        const lines = content.split('\n');
        const newLines = [];
        let skipMode = false;
        let foundPagination = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Check if we're at the start of pagination buttons
            if (line.includes('class="page-btn"') && line.includes('fa-angle-double-right')) {
                foundPagination = true;
                // Add our new pagination HTML
                newLines.push('                <button class="page-btn first" onclick="goToPage(1)" title="الصفحة الأولى"><i class="fas fa-angle-double-right"></i></button>');
                newLines.push('                <button class="page-btn prev" onclick="goToPrevPage()" title="السابق"><i class="fas fa-angle-right"></i></button>');
                newLines.push('                <div class="page-numbers" id="pageNumbers"></div>');
                newLines.push('                <button class="page-btn next" onclick="goToNextPage()" title="التالي"><i class="fas fa-angle-left"></i></button>');
                newLines.push('                <button class="page-btn last" onclick="goToLastPage()" title="الصفحة الأخيرة"><i class="fas fa-angle-double-left"></i></button>');
                skipMode = true;
                continue;
            }

            // Skip old pagination buttons until we reach the last one
            if (skipMode) {
                if (line.includes('fa-angle-double-left')) {
                    skipMode = false;
                    continue;
                }
                continue;
            }

            newLines.push(line);
        }

        if (foundPagination) {
            fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
            console.log('Pagination HTML updated successfully with line-by-line method!');
        } else {
            console.log('Could not find pagination section');
        }
    } else {
        console.log('Could not find pagination buttons at all');
    }
}
