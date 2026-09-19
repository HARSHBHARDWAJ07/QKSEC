import assert from "node:assert/strict";
import { test } from "node:test";
import { createPaginationMeta, getPaginationRange, parsePagination } from "./pagination.js";

test("pagination applies defaults and calculates a stable range", () => {
  const pagination = parsePagination({});

  assert.deepEqual(pagination, { page: 1, pageSize: 20 });
  assert.deepEqual(getPaginationRange(2, 10), { from: 10, to: 19 });
  assert.deepEqual(createPaginationMeta(2, 10, 25), {
    page: 2,
    pageSize: 10,
    total: 25,
    totalPages: 3,
  });
});

test("pagination rejects invalid or oversized page sizes", () => {
  assert.throws(() => parsePagination({ page: 0 }));
  assert.throws(() => parsePagination({ pageSize: 101 }));
});