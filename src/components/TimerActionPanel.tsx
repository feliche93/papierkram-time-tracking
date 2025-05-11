import React from "react";
import { ActionPanel, Action, Icon } from "@raycast/api";
import { TPapierkramForm } from "../papierkram-time-tracking"; // Adjust path as needed

// --- Props for the Action Panel Component ---
interface TimerActionPanelProps {
  timerState: TPapierkramForm["persistedTimerState"];
  onStart: () => void;
  onResume: () => void;
  onStop: () => void;
  onSubmitEntry: (values: TPapierkramForm) => void;
}

// --- Action Panel Component ---
function TimerActionPanel({ timerState, onStart, onResume, onStop, onSubmitEntry }: TimerActionPanelProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Timer">
        {typeof timerState === "undefined" && (
          <Action
            key="start"
            title="Start Timer"
            icon={Icon.Play}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            onAction={onStart}
          />
        )}

        {timerState === "stopped" && (
          <Action
            key="resume"
            title="Resume Timer"
            icon={Icon.Play}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={onResume}
          />
        )}

        {(timerState === "running") && (
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
