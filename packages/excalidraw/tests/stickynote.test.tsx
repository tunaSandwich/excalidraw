import React from "react";
import { vi } from "vitest";

import { KEYS, reseed } from "@excalidraw/common";
import { setDateTimeForTests } from "@excalidraw/common";

import { Excalidraw } from "../index";
import * as StaticScene from "../renderer/staticScene";

import { API } from "./helpers/api";
import { UI, Pointer, Keyboard } from "./helpers/ui";
import {
  render,
  fireEvent,
  mockBoundingClientRect,
  restoreOriginalGetBoundingClientRect,
  GlobalTestState,
  unmountComponent,
  act,
} from "./test-utils";

const mouse = new Pointer("mouse");

unmountComponent();

const renderStaticScene = vi.spyOn(StaticScene, "renderStaticScene");

beforeEach(() => {
  localStorage.clear();
  renderStaticScene.mockClear();
  reseed(7);
});

const { h } = window;

describe("Sticky Note tool", () => {
  beforeEach(async () => {
    localStorage.clear();
    renderStaticScene.mockClear();
    reseed(7);
    setDateTimeForTests("201933152653");
    await render(<Excalidraw handleKeyboardGlobally={true} />);
  });

  beforeAll(() => {
    mockBoundingClientRect();
  });

  afterAll(() => {
    restoreOriginalGetBoundingClientRect();
  });

  it("should activate via toolbar click", () => {
    UI.clickTool("stickynote");
    expect(h.state.activeTool.type).toBe("stickynote");
  });

  it("should activate via keyboard shortcut N", () => {
    Keyboard.keyPress(KEYS.N);
    expect(h.state.activeTool.type).toBe("stickynote");
  });

  it("should create a rectangle element with sticky note defaults on click", () => {
    UI.clickTool("stickynote");
    mouse.click(200, 300);

    expect(h.elements.length).toBeGreaterThanOrEqual(1);

    const stickyNote = h.elements.find(
      (el) => el.customData?.isStickyNote === true,
    );
    expect(stickyNote).toBeDefined();
    expect(stickyNote!.type).toBe("rectangle");
    expect(stickyNote!.backgroundColor).toBe("#FFF3BF");
    expect(stickyNote!.strokeColor).toBe("transparent");
    expect(stickyNote!.fillStyle).toBe("solid");
    expect(stickyNote!.roughness).toBe(0);
    expect(stickyNote!.customData?.reactions).toEqual([]);
  });

  it("should give a default size when just clicking (no drag)", () => {
    UI.clickTool("stickynote");
    mouse.click(200, 300);

    const stickyNote = h.elements.find(
      (el) => el.customData?.isStickyNote === true,
    );
    expect(stickyNote).toBeDefined();
    expect(stickyNote!.width).toBe(200);
    expect(stickyNote!.height).toBe(200);
  });

  it("should switch back to selection tool after creating a sticky note", () => {
    UI.clickTool("stickynote");
    mouse.click(200, 300);

    // After pointer up, the tool should switch back to selection
    // (text editing may be active, but the tool type should be selection-like)
    expect(
      h.state.activeTool.type === "selection" ||
        h.state.activeTool.type === "lasso",
    ).toBe(true);
  });

  it("should mark the element with customData.isStickyNote", () => {
    UI.clickTool("stickynote");
    mouse.click(200, 300);

    const stickyNote = h.elements.find(
      (el) => el.customData?.isStickyNote === true,
    );
    expect(stickyNote).toBeDefined();
    expect(stickyNote!.customData).toEqual({
      isStickyNote: true,
      reactions: [],
    });
  });

  it("should allow drag-to-create with custom size", () => {
    UI.clickTool("stickynote");
    mouse.down(100, 100);
    mouse.up(250, 200);

    const stickyNote = h.elements.find(
      (el) => el.customData?.isStickyNote === true,
    );
    expect(stickyNote).toBeDefined();
    expect(stickyNote!.width).toBeGreaterThan(0);
    expect(stickyNote!.height).toBeGreaterThan(0);
  });
});

describe("Sticky Note emoji reactions", () => {
  beforeEach(async () => {
    localStorage.clear();
    renderStaticScene.mockClear();
    reseed(7);
    setDateTimeForTests("201933152653");
    await render(<Excalidraw handleKeyboardGlobally={true} />);
  });

  beforeAll(() => {
    mockBoundingClientRect();
  });

  afterAll(() => {
    restoreOriginalGetBoundingClientRect();
  });

  const createStickyNoteElement = () => {
    const el = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      backgroundColor: "#FFF3BF",
      strokeColor: "transparent",
      fillStyle: "solid",
      roughness: 0,
    });
    // Set customData since API.createElement doesn't support it directly
    (el as any).customData = { isStickyNote: true, reactions: [] };
    API.setElements([el]);
    return el;
  };

  it("should show emoji picker in context menu for sticky notes", () => {
    createStickyNoteElement();

    fireEvent.contextMenu(GlobalTestState.interactiveCanvas, {
      button: 2,
      clientX: 100,
      clientY: 100,
    });

    const contextMenu = UI.queryContextMenu();
    expect(contextMenu).not.toBeNull();

    const emojiRow = contextMenu?.querySelector(
      ".context-menu-emoji-reactions",
    );
    expect(emojiRow).not.toBeNull();

    const emojiButtons = emojiRow?.querySelectorAll(".context-menu-emoji-btn");
    expect(emojiButtons?.length).toBe(6);
  });

  it("should NOT show emoji picker for regular rectangles", () => {
    const rect = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      backgroundColor: "red",
    });
    API.setElements([rect]);

    fireEvent.contextMenu(GlobalTestState.interactiveCanvas, {
      button: 2,
      clientX: 100,
      clientY: 100,
    });

    const contextMenu = UI.queryContextMenu();
    expect(contextMenu).not.toBeNull();

    const emojiRow = contextMenu?.querySelector(
      ".context-menu-emoji-reactions",
    );
    expect(emojiRow).toBeNull();
  });

  it("should add a reaction when emoji is clicked", () => {
    const stickyNote = createStickyNoteElement();
    expect(stickyNote.customData?.reactions).toEqual([]);

    fireEvent.contextMenu(GlobalTestState.interactiveCanvas, {
      button: 2,
      clientX: 100,
      clientY: 100,
    });

    const contextMenu = UI.queryContextMenu();
    const emojiButtons = contextMenu?.querySelectorAll(
      ".context-menu-emoji-btn",
    );
    expect(emojiButtons!.length).toBe(6);

    act(() => {
      fireEvent.click(emojiButtons![0]);
    });

    const updated = API.getElement(stickyNote);
    expect(updated.customData?.reactions).toEqual(["👍"]);
  });

  it("should toggle (remove) a reaction when clicking it again", () => {
    const stickyNote = createStickyNoteElement();

    act(() => {
      h.app.scene.mutateElement(stickyNote, {
        customData: { ...stickyNote.customData, reactions: ["👍"] },
      });
    });
    expect(API.getElement(stickyNote).customData?.reactions).toEqual(["👍"]);

    fireEvent.contextMenu(GlobalTestState.interactiveCanvas, {
      button: 2,
      clientX: 100,
      clientY: 100,
    });

    const contextMenu = UI.queryContextMenu();
    const emojiButtons = contextMenu?.querySelectorAll(
      ".context-menu-emoji-btn",
    );

    expect(
      emojiButtons![0].classList.contains("context-menu-emoji-btn--active"),
    ).toBe(true);

    act(() => {
      fireEvent.click(emojiButtons![0]);
    });

    const updated = API.getElement(stickyNote);
    expect(updated.customData?.reactions).toEqual([]);
  });

  it("should support multiple reactions", () => {
    const stickyNote = createStickyNoteElement();

    // Add first reaction
    fireEvent.contextMenu(GlobalTestState.interactiveCanvas, {
      button: 2,
      clientX: 100,
      clientY: 100,
    });
    let contextMenu = UI.queryContextMenu();
    let emojiButtons = contextMenu?.querySelectorAll(".context-menu-emoji-btn");
    act(() => {
      fireEvent.click(emojiButtons![0]); // 👍
    });

    // Add second reaction
    fireEvent.contextMenu(GlobalTestState.interactiveCanvas, {
      button: 2,
      clientX: 100,
      clientY: 100,
    });
    contextMenu = UI.queryContextMenu();
    emojiButtons = contextMenu?.querySelectorAll(".context-menu-emoji-btn");
    act(() => {
      fireEvent.click(emojiButtons![1]); // ❤️
    });

    // Add third reaction
    fireEvent.contextMenu(GlobalTestState.interactiveCanvas, {
      button: 2,
      clientX: 100,
      clientY: 100,
    });
    contextMenu = UI.queryContextMenu();
    emojiButtons = contextMenu?.querySelectorAll(".context-menu-emoji-btn");
    act(() => {
      fireEvent.click(emojiButtons![2]); // ⭐
    });

    const updated = API.getElement(stickyNote);
    expect(updated.customData?.reactions).toEqual(["👍", "❤️", "⭐"]);
  });

  it("should close context menu after selecting an emoji", () => {
    createStickyNoteElement();

    fireEvent.contextMenu(GlobalTestState.interactiveCanvas, {
      button: 2,
      clientX: 100,
      clientY: 100,
    });

    expect(h.state.contextMenu).not.toBeNull();

    const contextMenu = UI.queryContextMenu();
    const emojiButtons = contextMenu?.querySelectorAll(
      ".context-menu-emoji-btn",
    );
    act(() => {
      fireEvent.click(emojiButtons![0]);
    });

    expect(h.state.contextMenu).toBeNull();
    expect(h.state.emojiReactionPicker).toBeNull();
  });

  it("should preserve reactions in customData through mutation", () => {
    const stickyNote = createStickyNoteElement();

    act(() => {
      h.app.scene.mutateElement(stickyNote, {
        customData: {
          ...stickyNote.customData,
          reactions: ["👍", "🔥"],
        },
      });
    });

    const updated = API.getElement(stickyNote);
    expect(updated.customData).toEqual({
      isStickyNote: true,
      reactions: ["👍", "🔥"],
    });
  });
});
