import { createStore, del } from "idb-keyval";

import { STORAGE_KEYS } from "../app_constants";
import { DEFAULT_LIBRARY_ITEMS } from "../data/defaultLibraryItems";
import { LibraryIndexedDBAdapter } from "../data/LocalData";

const LIBRARY_STORE = createStore(
  `${STORAGE_KEYS.IDB_LIBRARY}-db`,
  `${STORAGE_KEYS.IDB_LIBRARY}-store`,
);
const LIBRARY_STORE_KEY = "libraryData";

describe("library defaults", () => {
  beforeEach(async () => {
    await del(LIBRARY_STORE_KEY, LIBRARY_STORE);
  });

  it("seeds a table template when no library data exists", async () => {
    const data = await LibraryIndexedDBAdapter.load();

    expect(data).toEqual(DEFAULT_LIBRARY_ITEMS);
    expect(data?.libraryItems).toHaveLength(1);
    expect(data?.libraryItems[0].name).toBe("Table");
    expect(data?.libraryItems[0].elements).toHaveLength(9);
  });

  it("doesn't reseed after user explicitly clears library", async () => {
    await LibraryIndexedDBAdapter.save({ libraryItems: [] });

    const data = await LibraryIndexedDBAdapter.load();

    expect(data).toEqual({ libraryItems: [] });
  });
});
