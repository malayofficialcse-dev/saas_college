import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}) => {
  const from = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-3.5 py-3 border-t border-[#E5E7EB] bg-white text-[13px] text-[#667085]">
      <div>
        Showing <span className="font-medium text-[#202938]">{totalItems > 0 ? from : 0}</span> to{' '}
        <span className="font-medium text-[#202938]">{to}</span> of{' '}
        <span className="font-medium text-[#202938]">{totalItems}</span> results
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-8 px-2"
        >
          <ChevronLeft size={14} className="mr-1" /> Prev
        </Button>
        <span className="text-[12px] px-2 font-medium text-[#202938]">
          Page {currentPage} of {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-8 px-2"
        >
          Next <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>
    </div>
  );
};
