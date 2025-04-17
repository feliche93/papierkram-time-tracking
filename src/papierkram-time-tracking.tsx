import { ActionPanel, Action, Form, showToast, Toast, LocalStorage } from "@raycast/api";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocalStorage } from "@raycast/utils";

// Define the structure for the form values
interface TimeEntryValues {
  customerProject: string;
  task: string;
  comment: string;
  startTime: Date | null;
  endTime: Date | null;
  isBillable: boolean;
}

// LocalStorage keys
const LS_KEY_IS_RUNNING = "papierkramTimerIsRunning";
const LS_KEY_ACCUMULATED_SECONDS = "papierkramTimerAccumulatedSeconds";
const LS_KEY_LAST_START_TIME = "papierkramTimerLastStartTime";
const LS_KEY_SAVED_START_TIME = "papierkramTimerSavedStartTime";
const LS_KEY_SAVED_PROJECT = "papierkramTimerSavedProject";
const LS_KEY_SAVED_TASK = "papierkramTimerSavedTask";
const LS_KEY_SAVED_COMMENT = "papierkramTimerSavedComment";
const LS_KEY_SAVED_IS_BILLABLE = "papierkramTimerSavedIsBillable";

// Helper function to format seconds into HH:MM:SS
function formatTime(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) {
    return "00:00:00"; // Return default on invalid input
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    seconds.toString().padStart(2, "0"),
  ].join(":");
}

// Main command component
export default function PapierkramTimeTrackingCommand() {
  // Form field state
  const { value: customerProject, setValue: setCustomerProject } = useLocalStorage<string>(LS_KEY_SAVED_PROJECT, "");
  const { value: task, setValue: setTask } = useLocalStorage<string>(LS_KEY_SAVED_TASK, "");
  const { value: comment, setValue: setComment } = useLocalStorage<string>(LS_KEY_SAVED_COMMENT, "");
  const { value: isBillable, setValue: setIsBillable } = useLocalStorage<boolean>(LS_KEY_SAVED_IS_BILLABLE, true);
  const { value: startTimeStr, setValue: setStartTimeStr } = useLocalStorage<string | null>(LS_KEY_SAVED_START_TIME, null);
  const startTime = useMemo(() => startTimeStr ? new Date(startTimeStr) : null, [startTimeStr]);
  const [endTime, setEndTime] = useState<Date | null>(null);

  // Timer state
  const { value: isRunning, setValue: setIsRunning } = useLocalStorage<boolean>(LS_KEY_IS_RUNNING, false);
  const { value: accumulatedSeconds, setValue: setAccumulatedSeconds } = useLocalStorage<number>(LS_KEY_ACCUMULATED_SECONDS, 0);
  const { value: lastStartTime, setValue: setLastStartTime } = useLocalStorage<number | null>(LS_KEY_LAST_START_TIME, null);

  // Local state (non-persisted or needs parsing)
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [displayTime, setDisplayTime] = useState<string>(formatTime(accumulatedSeconds ?? 0)); // Init with hook's default/loaded value
  const [customerProjectError, setCustomerProjectError] = useState<string | undefined>();
  const isInitialCalculationDone = useRef(false); // Ref to track initial calculation

  // --- Effects --- 

  // Effect 2: Perform initial elapsed time calculation if timer was running when closed
  useEffect(() => {
    // Check if running and lastStartTime is a valid number
    if (!isInitialCalculationDone.current && isRunning === true && typeof lastStartTime === 'number' && lastStartTime > 0) {
      const currentAccumulated = accumulatedSeconds ?? 0;
      const elapsedWhileClosed = Math.floor((Date.now() - lastStartTime) / 1000);
      
      if (elapsedWhileClosed > 0) {
         const newAccumulated = currentAccumulated + elapsedWhileClosed;
         setAccumulatedSeconds(newAccumulated);
         setLastStartTime(Date.now()); 
         setDisplayTime(formatTime(newAccumulated));
      }
      isInitialCalculationDone.current = true; // Mark calculation as done
    }
  }, [isRunning, lastStartTime, accumulatedSeconds, setAccumulatedSeconds, setLastStartTime]);

  // Effect 3: Interval timer effect for live updates / displaying paused time
  useEffect(() => {
    // Check if running and lastStartTime is a valid number
    if (isRunning === true && typeof lastStartTime === 'number' && lastStartTime > 0) {
      // Update display immediately when starting/resuming
      const initialElapsed = Math.floor((Date.now() - lastStartTime) / 1000);
      setDisplayTime(formatTime((accumulatedSeconds ?? 0) + initialElapsed)); 

      const id = setInterval(() => {
        // Re-check lastStartTime inside interval for safety, though it should be valid
        if (typeof lastStartTime === 'number' && lastStartTime > 0) {
            const currentAcc = accumulatedSeconds ?? 0; 
            const elapsed = Math.floor((Date.now() - lastStartTime) / 1000); 
            setDisplayTime(formatTime(currentAcc + elapsed));
        } else {
            // Should not happen if isRunning is true, but clear interval if state is inconsistent
            if(intervalId) clearInterval(intervalId);
            setIntervalId(null);
        }
      }, 1000);
      setIntervalId(id);
      return () => clearInterval(id); // Cleanup interval
    } else if (intervalId) {
      // Clear interval if timer is stopped or lastStartTime is invalid
      clearInterval(intervalId);
      setIntervalId(null);
    }
    
    // Update display based on accumulated seconds if paused
    if (!isRunning) {
      setDisplayTime(formatTime(accumulatedSeconds ?? 0)); 
    }
  }, [isRunning, lastStartTime, accumulatedSeconds, intervalId]);

  // Validation function
  const validateCustomerProject = useCallback((value: string | undefined) => {
    if (value && value.length > 0) {
      setCustomerProjectError(undefined);
      return true;
    } else {
      setCustomerProjectError("Customer/Project cannot be empty");
      return false;
    }
  }, []);

  // --- Timer Actions --- 
  const handleStartTimer = useCallback(async () => {
    if (!validateCustomerProject(customerProject)) return;
    const now = new Date();
    const nowTimestamp = now.getTime();

    setStartTimeStr(now.toISOString());
    setEndTime(null);
    await setAccumulatedSeconds(0);
    await setLastStartTime(nowTimestamp);
    await setIsRunning(true);

    showToast(Toast.Style.Success, "Timer Started");
  }, [customerProject, validateCustomerProject, setAccumulatedSeconds, setLastStartTime, setIsRunning, setStartTimeStr]);

  const handlePauseTimer = useCallback(async () => {
    if (intervalId) clearInterval(intervalId);
    setIntervalId(null);
    
    let finalAccumulated = accumulatedSeconds ?? 0; 
    if (lastStartTime) {
      const elapsed = Math.floor((Date.now() - lastStartTime) / 1000);
      finalAccumulated += elapsed;
      // Update accumulated seconds state *before* setting isRunning to false
      await setAccumulatedSeconds(finalAccumulated);
    }
    
    // Now set isRunning to false and clear lastStartTime
    await setIsRunning(false);
    await setLastStartTime(null); // Clear last start time when paused

    // const now = new Date(); // Don't set endTime state automatically on pause
    // setEndTime(now);
    setDisplayTime(formatTime(finalAccumulated)); 
    showToast(Toast.Style.Success, "Timer Paused");

  }, [intervalId, lastStartTime, accumulatedSeconds, setAccumulatedSeconds, setLastStartTime, setIsRunning]);

  const handleResumeTimer = useCallback(async () => {
    if (!validateCustomerProject(customerProject)) return;
    if (!startTime) {
      showToast(Toast.Style.Failure, "Cannot resume without a start time.");
      return;
    }
    const nowTimestamp = Date.now();
    await setLastStartTime(nowTimestamp);
    await setIsRunning(true);
    setEndTime(null); 
    showToast(Toast.Style.Success, "Timer Resumed");
  }, [customerProject, validateCustomerProject, startTime, setLastStartTime, setIsRunning]);

  const handleResetTimer = useCallback(async () => {
    if (intervalId) clearInterval(intervalId);
    setIntervalId(null);
    
    // Clear persisted state using setValue(initialValue) or removeValue() from useLocalStorage if available (or manual LocalStorage.removeItem)
    await setIsRunning(false);
    await setAccumulatedSeconds(0);
    await setLastStartTime(null);
    await setCustomerProject("");
    await setTask("");
    await setComment("");
    await setIsBillable(true);
    // Clear start time string state
    setStartTimeStr(null);
    // await LocalStorage.removeItem(LS_KEY_SAVED_START_TIME); // No longer needed

    // Reset local state
    // setStartTime(new Date()); // No longer setting Date object directly
    setEndTime(null);
    setDisplayTime("00:00:00");

    showToast(Toast.Style.Success, "Timer Reset");
  }, [intervalId, setIsRunning, setAccumulatedSeconds, setLastStartTime, setCustomerProject, setTask, setComment, setIsBillable, setStartTimeStr]);


  // --- Form Submission --- 
  async function handleSubmit() {
    if (!validateCustomerProject(customerProject)) return;
    
    let currentAccumulated = accumulatedSeconds ?? 0;
    let finalStartTime = startTime;

    // If running, pause first to finalize accumulatedSeconds
    if (isRunning) {
       if (intervalId) clearInterval(intervalId);
       setIntervalId(null);
       
       if (lastStartTime) {
         const elapsed = Math.floor((Date.now() - lastStartTime) / 1000);
         currentAccumulated += elapsed;
         await setAccumulatedSeconds(currentAccumulated);
       }
       await setIsRunning(false); 
       await setLastStartTime(null);
       // No need to re-read startTime, useMemo keeps the derived 'startTime' up to date
       // const savedStartTimeStr = await LocalStorage.getItem<string>(LS_KEY_SAVED_START_TIME);
       // finalStartTime = savedStartTimeStr ? new Date(savedStartTimeStr) : null;
       showToast(Toast.Style.Success, "Timer auto-paused for saving");
    } else {
       // If timer wasn't running, ensure finalStartTime uses the current derived state
       finalStartTime = startTime;
    }

    if (!finalStartTime) {
       showToast(Toast.Style.Failure, "Start time is missing.");
       return;
    }

    let finalEndTime : Date;
    
    // Check if user manually set an end time *after* pausing
    if (endTime !== null) { 
      finalEndTime = endTime; 
    } else {
      // Otherwise, calculate end time based on start and accumulated duration
      finalEndTime = new Date(finalStartTime.getTime() + currentAccumulated * 1000);
    }
    
    // Final sanity check - ensure end time isn't before start time if manually entered
    if (finalEndTime.getTime() < finalStartTime.getTime()) {
        showToast(Toast.Style.Failure, "End time cannot be before start time.");
        return;
    }

    const values: TimeEntryValues = {
        customerProject: customerProject ?? "", 
        task: task ?? "",
        comment: comment ?? "",
        startTime: finalStartTime, // Use potentially re-read start time
        endTime: finalEndTime, 
        isBillable: isBillable ?? true,
      };

    const durationSeconds = Math.floor((finalEndTime.getTime() - finalStartTime.getTime()) / 1000);

    // Ensure calculated duration matches accumulated if timer was used (allowing for minor ms rounding)
    if (currentAccumulated > 0 && Math.abs(durationSeconds - currentAccumulated) > 1) {
         console.warn(`Mismatch between calculated duration (${durationSeconds}s) and accumulated timer (${currentAccumulated}s). Using calculated duration.`);
    }

    console.log("Form submitted with values:", values);
    console.log("Final Duration (seconds):", durationSeconds);
    showToast(Toast.Style.Success, "Time Entry Submitted (Placeholder)");

    await handleResetTimer(); 

    // TODO: Implement API call to Papierkram here using values
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Timer">
            {!isRunning && (accumulatedSeconds ?? 0) === 0 && (
              <Action title="Start Timer" icon={{ source: "play-icon.png" }} onAction={handleStartTimer} />
            )}
            {isRunning && (
              <Action title="Pause Timer" icon={{ source: "pause-icon.png" }} onAction={handlePauseTimer} />
            )}
            {!isRunning && (accumulatedSeconds ?? 0) > 0 && (
              <Action title="Resume Timer" icon={{ source: "play-icon.png" }} onAction={handleResumeTimer} />
            )}
            <Action title="Reset Timer" icon={{ source: "stop-icon.png" }} shortcut={{ modifiers: ["cmd", "shift"], key: "r" }} onAction={handleResetTimer} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Entry">
            <Action.SubmitForm title="Save Time Entry" onSubmit={handleSubmit} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description text={`Log Time for Papierkram - Elapsed: ${displayTime}`} />

      {/* Customer / Project Field */}
      <Form.TextField
        id="customerProject"
        title="Customer/Project"
        placeholder="Enter customer or project name"
        value={customerProject ?? ""} 
        onChange={setCustomerProject}
        error={customerProjectError}
        onBlur={(event) => validateCustomerProject(event.target.value)}
      />

      {/* Task Field */}
      <Form.TextField
        id="task"
        title="Task"
        placeholder="Enter task description"
        value={task ?? ""} 
        onChange={setTask}
      />

      {/* Comment Field */}
      <Form.TextArea
        id="comment"
        title="Comment"
        placeholder="Enter comments (optional)"
        value={comment ?? ""} 
        onChange={setComment}
      />

      <Form.Separator />

      {/* Start Time Field */}
      <Form.DatePicker
        id="startTime"
        title="Start Time"
        value={startTime}
        onChange={(newValue) => {
          if (!isRunning) {
            setStartTimeStr(newValue ? newValue.toISOString() : null);
          }
        }}
      />

      {/* End Time Field */}
      <Form.DatePicker
        id="endTime"
        title="End Time"
        value={endTime}
        onChange={(newValue) => {
          if (!isRunning) { 
            setEndTime(newValue);
          }
        }}
      />

      {/* Billable Checkbox */}
      <Form.Checkbox
        id="isBillable"
        label="Is this time entry billable?"
        title="Billable"
        value={isBillable ?? true} 
        onChange={setIsBillable}
      />
    </Form>
  );
}
