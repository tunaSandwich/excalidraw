import { convertToExcalidrawElements } from "@excalidraw/element";

import type { ExcalidrawElementSkeleton } from "@excalidraw/element";
import type { LibraryPersistedData } from "@excalidraw/excalidraw/data/library";

const TABLE_WIDTH = 480;
const TABLE_HEIGHT = 240;
const TABLE_ROWS = 5;
const TABLE_COLUMNS = 4;
const HEADER_HEIGHT = TABLE_HEIGHT / TABLE_ROWS;
const COLUMN_WIDTH = TABLE_WIDTH / TABLE_COLUMNS;
const ROW_HEIGHT = TABLE_HEIGHT / TABLE_ROWS;

const TABLE_TEMPLATE_ELEMENTS: ExcalidrawElementSkeleton[] = [
  {
    id: "table-template-header",
    type: "rectangle",
    x: 0,
    y: 0,
    width: TABLE_WIDTH,
    height: HEADER_HEIGHT,
    strokeColor: "transparent",
    backgroundColor: "#f1f3f5",
    strokeWidth: 1,
    roughness: 0,
  },
  {
    id: "table-template-outline",
    type: "rectangle",
    x: 0,
    y: 0,
    width: TABLE_WIDTH,
    height: TABLE_HEIGHT,
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
    strokeWidth: 2,
    roughness: 0,
  },
  ...Array.from({ length: TABLE_ROWS - 1 }, (_, index) => ({
    id: `table-template-row-${index + 1}`,
    type: "line" as const,
    x: 0,
    y: ROW_HEIGHT * (index + 1),
    width: TABLE_WIDTH,
    height: 0,
    strokeColor: "#1e1e1e",
    strokeWidth: 1,
    roughness: 0,
  })),
  ...Array.from({ length: TABLE_COLUMNS - 1 }, (_, index) => ({
    id: `table-template-column-${index + 1}`,
    type: "line" as const,
    x: COLUMN_WIDTH * (index + 1),
    y: 0,
    width: 0,
    height: TABLE_HEIGHT,
    strokeColor: "#1e1e1e",
    strokeWidth: 1,
    roughness: 0,
  })),
];

export const DEFAULT_LIBRARY_ITEMS: LibraryPersistedData = {
  libraryItems: [
    {
      id: "template-table-v1",
      status: "published",
      created: 1740614400000,
      name: "Table",
      elements: convertToExcalidrawElements(TABLE_TEMPLATE_ELEMENTS, {
        regenerateIds: false,
      }),
    },
  ],
};
