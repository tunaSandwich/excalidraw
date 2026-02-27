import React from "react";

import { pointFrom } from "@excalidraw/math";

import { reseed } from "@excalidraw/common";

import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { UI } from "./helpers/ui";
import { render, unmountComponent } from "./test-utils";

const { h } = window;

describe("freedraw shape assist", () => {
  beforeEach(async () => {
    unmountComponent();
    localStorage.clear();
    reseed(7);
    await render(<Excalidraw handleKeyboardGlobally={true} />);
  });

  it("remains freedraw when shape assist is disabled", () => {
    UI.createElement("freedraw", {
      x: 50,
      y: 40,
      points: [
        pointFrom(0, 0),
        pointFrom(120, 0),
        pointFrom(120, 80),
        pointFrom(0, 80),
        pointFrom(0, 0),
      ],
    });

    expect(h.elements).toHaveLength(1);
    expect(h.elements[0].type).toBe("freedraw");
  });

  it("converts a closed freehand rectangle to rectangle when enabled", () => {
    API.setAppState({
      isConvertToShapeEnabled: true,
    });

    UI.createElement("freedraw", {
      x: 50,
      y: 40,
      points: [
        pointFrom(0, 0),
        pointFrom(120, 0),
        pointFrom(120, 80),
        pointFrom(0, 80),
        pointFrom(0, 0),
      ],
    });

    expect(h.elements).toHaveLength(1);
    expect(h.elements[0].type).toBe("rectangle");
  });

  it("converts a straight freehand stroke to line when enabled", () => {
    API.setAppState({
      isConvertToShapeEnabled: true,
    });

    UI.createElement("freedraw", {
      x: 10,
      y: 10,
      points: [pointFrom(0, 0), pointFrom(60, 0), pointFrom(120, 0)],
    });

    expect(h.elements).toHaveLength(1);
    expect(h.elements[0].type).toBe("line");
  });

  it("toggles shape assist from the freehand actions panel", () => {
    UI.clickTool("freedraw");

    UI.clickByTitle("Enable convert to shapes");
    expect(h.state.isConvertToShapeEnabled).toBe(true);

    UI.clickByTitle("Disable convert to shapes");
    expect(h.state.isConvertToShapeEnabled).toBe(false);
  });
});
