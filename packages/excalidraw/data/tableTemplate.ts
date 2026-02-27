import { randomId } from "@excalidraw/common";
import { convertToExcalidrawElements } from "@excalidraw/element";

import type { ExcalidrawElementSkeleton } from "@excalidraw/element";

import type { LibraryItem } from "../types";

const DEFAULT_COLS = 4;
const DEFAULT_ROWS = 4;
const CELL_WIDTH = 100;
const CELL_HEIGHT = 36;
const HEADER_BG = "#a5d8ff";

export const TABLE_TEMPLATE_ID = "excalidraw-default-table-template";

/**
 * Creates a table template library item consisting of a grid of
 * rectangles with a colored header row, all sharing a groupId.
 */
export const createTableTemplate = (
  rows: number = DEFAULT_ROWS,
  cols: number = DEFAULT_COLS,
): LibraryItem => {
  const groupId = randomId();
  const skeletons: ExcalidrawElementSkeleton[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      skeletons.push({
        type: "rectangle",
        x: col * CELL_WIDTH,
        y: row * CELL_HEIGHT,
        width: CELL_WIDTH,
        height: CELL_HEIGHT,
        strokeColor: "#1e1e1e",
        backgroundColor: row === 0 ? HEADER_BG : "transparent",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds: [groupId],
        roundness: null,
      });
    }
  }

  return {
    id: TABLE_TEMPLATE_ID,
    status: "unpublished",
    elements: convertToExcalidrawElements(skeletons),
    created: Date.now(),
    name: "Table",
  };
};
