/**
 * Default table template for the Excalidraw library.
 * A 3x3 grid that users can insert and customize.
 *
 * @see https://github.com/excalidraw/excalidraw/issues/5265
 */

import { randomId } from "@excalidraw/common";
import { newElement } from "@excalidraw/element";
import type { LibraryItem } from "@excalidraw/excalidraw/types";

const CELL_WIDTH = 100;
const CELL_HEIGHT = 40;
const ROWS = 3;
const COLS = 3;

export const TABLE_TEMPLATE_LIBRARY_ITEM: LibraryItem = {
  id: randomId(),
  status: "unpublished",
  name: "Table",
  created: Date.now(),
  elements: (() => {
    const elements = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = newElement({
          type: "rectangle",
          x: col * CELL_WIDTH,
          y: row * CELL_HEIGHT,
          width: CELL_WIDTH,
          height: CELL_HEIGHT,
          strokeColor: "#1e1e1e",
          backgroundColor: "transparent",
          fillStyle: "solid",
          strokeWidth: 1,
          strokeStyle: "solid",
          roughness: 1,
          opacity: 100,
        });
        elements.push(cell);
      }
    }
    return elements;
  })(),
};

export const DEFAULT_LIBRARY_ITEMS: LibraryItem[] = [
  TABLE_TEMPLATE_LIBRARY_ITEM,
];
