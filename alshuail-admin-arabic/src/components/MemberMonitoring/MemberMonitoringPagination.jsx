import React, { memo, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const MemberMonitoringPagination = memo(({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange
}) => {
  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, onPageChange]);

  const handlePageSizeChange = useCallback((e) => {
    onPageSizeChange(Number(e.target.value));
  }, [onPageSizeChange]);

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        <span>عرض {startItem} - {endItem} من {totalItems} عضو</span>

        <div className="page-size-selector">
          <label>عرض:</label>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="page-size-select"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>لكل صفحة</span>
        </div>
      </div>

      <div className="pagination-controls">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="page-btn"
          aria-label="الصفحة السابقة"
        >
          <ChevronRightIcon className="page-icon" />
        </button>

        <div className="page-numbers">
          {currentPage > 3 && (
            <>
              <button
                onClick={() => onPageChange(1)}
                className="page-number"
              >
                1
              </button>
              {currentPage > 4 && <span className="page-ellipsis">...</span>}
            </>
          )}

          {getPageNumbers().map(page => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`page-number ${page === currentPage ? 'active' : ''}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          ))}

          {currentPage < totalPages - 2 && (
            <>
              {currentPage < totalPages - 3 && <span className="page-ellipsis">...</span>}
              <button
                onClick={() => onPageChange(totalPages)}
                className="page-number"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className="page-btn"
          aria-label="الصفحة التالية"
        >
          <ChevronLeftIcon className="page-icon" />
        </button>
      </div>
    </div>
  );
});

MemberMonitoringPagination.displayName = 'MemberMonitoringPagination';

export default MemberMonitoringPagination;