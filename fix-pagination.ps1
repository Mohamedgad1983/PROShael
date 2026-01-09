$file = 'D:\PROShael\alshuail-admin-arabic\public\monitoring-standalone\index.html'
$content = Get-Content $file -Raw -Encoding UTF8

$old = @'
<button class="page-btn"><i class="fas fa-angle-double-right"></i></button>
                <button class="page-btn"><i class="fas fa-angle-right"></i></button>
                <button class="page-btn active">1</button>
                <button class="page-btn">2</button>
                <button class="page-btn">3</button>
                <button class="page-btn">4</button>
                <button class="page-btn">5</button>
                <button class="page-btn"><i class="fas fa-angle-left"></i></button>
                <button class="page-btn"><i class="fas fa-angle-double-left"></i></button>
'@

$new = @'
<button class="page-btn first" onclick="goToPage(1)" title="الصفحة الأولى"><i class="fas fa-angle-double-right"></i></button>
                <button class="page-btn prev" onclick="goToPrevPage()" title="السابق"><i class="fas fa-angle-right"></i></button>
                <div class="page-numbers" id="pageNumbers"></div>
                <button class="page-btn next" onclick="goToNextPage()" title="التالي"><i class="fas fa-angle-left"></i></button>
                <button class="page-btn last" onclick="goToLastPage()" title="الصفحة الأخيرة"><i class="fas fa-angle-double-left"></i></button>
'@

$content = $content.Replace($old, $new)
Set-Content $file $content -NoNewline -Encoding UTF8
Write-Output "Pagination HTML updated successfully!"
