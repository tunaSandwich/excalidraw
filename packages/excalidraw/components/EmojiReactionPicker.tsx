import React from "react";

import { Popover } from "./Popover";

import "./EmojiReactionPicker.scss";

import type { StaticCanvasAppState } from "../types";

const REACTION_EMOJIS = ["👍", "❤️", "⭐", "🔥", "✅", "❓"] as const;

export type ReactionEmoji = typeof REACTION_EMOJIS[number];

export const isStickyNoteElement = (
  element: { type: string; customData?: Record<string, any> } | null,
): boolean => {
  return (
    element != null &&
    element.type === "rectangle" &&
    element.customData?.isStickyNote === true
  );
};

export const EmojiReactionPicker = ({
  top,
  left,
  reactions,
  onSelect,
  onClose,
  appState,
}: {
  top: number;
  left: number;
  reactions: string[];
  onSelect: (emoji: string) => void;
  onClose: () => void;
  appState: Pick<
    StaticCanvasAppState,
    "offsetLeft" | "offsetTop" | "width" | "height"
  >;
}) => {
  return (
    <Popover
      onCloseRequest={onClose}
      top={top}
      left={left}
      fitInViewport={true}
      offsetLeft={appState.offsetLeft}
      offsetTop={appState.offsetTop}
      viewportWidth={appState.width}
      viewportHeight={appState.height}
      className="emoji-reaction-picker-popover"
    >
      <div
        className="emoji-reaction-picker"
        onContextMenu={(e) => e.preventDefault()}
      >
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={`emoji-reaction-picker__btn${
              reactions.includes(emoji)
                ? " emoji-reaction-picker__btn--active"
                : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(emoji);
            }}
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </Popover>
  );
};
