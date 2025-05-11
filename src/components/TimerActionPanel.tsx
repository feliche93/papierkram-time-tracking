import React from "react";
import { ActionPanel, Action, Icon } from "@raycast/api";
import { TPapierkramForm } from "../papierkram-time-tracking"; // Adjust path as needed

// --- Props for the Action Panel Component ---
interface TimerActionPanelProps {
  timerState: "running" | "paused" | "stopped";
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSubmitEntry: (values: TPapierkramForm) => void;
}

// --- Action Panel Component ---
function TimerActionPanel({ timerState, onStart, onPause, onResume, onStop, onSubmitEntry }: TimerActionPanelProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Timer">
        {timerState === "stopped" && (
          <Action
            key="start"
            title="Start Timer"
            icon={Icon.Play}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            onAction={onStart}
          />
        )}

        {timerState === "running" && (
          <Action
            key="pause"
            title="Pause Timer"
            icon={Icon.Pause}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={onPause}
          />
        )}

        {timerState === "paused" && (
          <Action
            key="resume"
            title="Resume Timer"
            icon={Icon.Play}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={onResume}
          />
        )}

        {(timerState === "running" || timerState === "paused") && (
          <Action
            key="stop"
            title="Stop Timer"
            icon={Icon.Stop}
            shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
            onAction={onStop}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Entry">
        <Action.SubmitForm title="Save Time Entry" onSubmit={onSubmitEntry} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default TimerActionPanel;
