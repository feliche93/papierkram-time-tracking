// import { MenuBarExtra, Icon, LocalStorage, openCommand, environment } from "@raycast/api";
// import { useLocalStorage } from "@raycast/utils";
// import {
//   LS_KEY_IS_RUNNING,
//   LS_KEY_ACCUMULATED_SECONDS,
//   LS_KEY_LAST_START_TIME,
//   LS_KEY_SAVED_PROJECT,
// } from "./papierkram-time-tracking"; // Adjust path if needed
// import { formatDuration } from "date-fns";

// export default function PapierkramMenuBarCommand() {
//   // Read timer state from LocalStorage
//   const { value: isRunning, isLoading: isLoadingIsRunning } = useLocalStorage<boolean>(LS_KEY_IS_RUNNING, false);
//   const { value: accumulatedSeconds, isLoading: isLoadingAccumulated } = useLocalStorage<number>(
//     LS_KEY_ACCUMULATED_SECONDS,
//     0
//   );
//   const { value: lastStartTime, isLoading: isLoadingLastStart } = useLocalStorage<number | null>(
//     LS_KEY_LAST_START_TIME,
//     null
//   );
//   const { value: customerProject, isLoading: isLoadingProject } = useLocalStorage<string>(LS_KEY_SAVED_PROJECT, "");

//   const isLoading = isLoadingIsRunning || isLoadingAccumulated || isLoadingLastStart || isLoadingProject;

//   // Calculate current display time (this logic runs every second due to interval)
//   let currentTotalSeconds = accumulatedSeconds ?? 0;
//   if (isRunning && typeof lastStartTime === "number" && lastStartTime > 0) {
//     const elapsedSinceLastStart = Math.floor((Date.now() - lastStartTime) / 1000);
//     currentTotalSeconds += elapsedSinceLastStart;
//   }

//   const formattedTime = formatDuration({ seconds: currentTotalSeconds });

//   // Determine icon and title
//   let title = formattedTime;
//   let icon = Icon.Clock;
//   let tooltip = "Papierkram Timer";

//   if (isRunning) {
//     icon = Icon.PlayFilled; // Or Icon.Stopwatch
//     const projectPrefix = customerProject ? `${customerProject}: ` : "";
//     title = `${projectPrefix}${formattedTime}`;
//     tooltip = `Tracking ${customerProject || 'time'}`;
//   } else if (currentTotalSeconds > 0) {
//     icon = Icon.PauseFilled;
//     title = `Paused: ${formattedTime}`;
//     tooltip = "Timer Paused";
//   } else {
//     icon = Icon.Clock;
//     title = "Timer Ready";
//     tooltip = "Papierkram Timer Ready";
//   }

//   return (
//     <MenuBarExtra icon={icon} title={isLoading ? "..." : title} tooltip={tooltip}>
//       <MenuBarExtra.Item
//         title="Open Time Logger"
//         icon={Icon.NewDocument}
//         onAction={() => openCommand({ name: "papierkram-time-tracking" })}
//       />
//       {/* Potential future actions: Pause/Resume/Stop directly from menu? */}
//     </MenuBarExtra>
//   );
// }
