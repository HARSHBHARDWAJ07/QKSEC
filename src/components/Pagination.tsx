type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const Pagination = ({ page, totalPages, onPageChange }: PaginationProps) => {
  const safeTotalPages = Math.max(totalPages, 1);
  const pageNumbers = Array.from({ length: safeTotalPages }, (_, i) => i + 1);

  return (
    <div className="p-4 flex items-center justify-between text-gray-500">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="py-2 px-4 rounded-md bg-slate-200 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Prev
      </button>
      <div className="flex items-center gap-2 text-sm">
        {pageNumbers.map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={`min-w-7 px-2 py-0.5 rounded-sm ${p === page ? "bg-lamaSky text-white" : "hover:bg-slate-100"}`}
          >
            {p}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={page >= safeTotalPages}
        onClick={() => onPageChange(page + 1)}
        className="py-2 px-4 rounded-md bg-slate-200 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
