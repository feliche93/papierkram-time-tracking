import { ActionPanel, Action, Form, showToast, Toast, LocalStorage } from "@raycast/api";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocalStorage, useForm, FormValidation } from "@raycast/utils";

// Define the structure for the form values managed by useForm
interface PapierkramFormValues {
  customerProject: string;
  task: string;
  comment: string;
  isBillable: boolean;
}

// Define the structure for the final time entry submission
interface TimeEntryValues {
  customerProject: string;
  task: string;
  comment: string;
  startTime: Date;
  endTime: Date;
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
  // --- Form State (Managed by useForm) ---
  const { handleSubmit: handleFormSubmit, itemProps, values: formValues, reset: resetForm } = useForm<PapierkramFormValues>({
    onSubmit(values) {
      submitTimeEntry(values);
    },
    validation: {
      customerProject: FormValidation.Required,
    },
    // initialValues will be set via effect after loading from LocalStorage
  });

  // --- Timer State (Managed by useLocalStorage & useState) ---
  const { value: isRunning, setValue: setIsRunning } = useLocalStorage<boolean>(LS_KEY_IS_RUNNING, false);
  const { value: accumulatedSeconds, setValue: setAccumulatedSeconds } = useLocalStorage<number>(LS_KEY_ACCUMULATED_SECONDS, 0);
  const { value: lastStartTime, setValue: setLastStartTime } = useLocalStorage<number | null>(LS_KEY_LAST_START_TIME, null);
  const { value: startTimeStr, setValue: setStartTimeStr } = useLocalStorage<string | null>(LS_KEY_SAVED_START_TIME, null);
  const startTime = useMemo(() => startTimeStr ? new Date(startTimeStr) : null, [startTimeStr]);
  const [endTime, setEndTime] = useState<Date | null>(null);

  // --- Other State ---
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [displayTime, setDisplayTime] = useState<string>(formatTime(accumulatedSeconds ?? 0));
  const isInitialCalculationDone = useRef(false);
  const isLoadingFormValues = useRef(true); // Flag to prevent sync effect running before initial load

  // Log endTime state on each render
  console.log("Rendering component, current endTime state:", endTime);

  // --- Effects ---

  // Effect: Load initial form values from LocalStorage ONCE on mount
  useEffect(() => {
    async function loadInitialFormValues() {
      try {
        const [initialProject, initialTask, initialComment, initialBillableStr] = await Promise.all([
          LocalStorage.getItem<string>(LS_KEY_SAVED_PROJECT),
          LocalStorage.getItem<string>(LS_KEY_SAVED_TASK),
          LocalStorage.getItem<string>(LS_KEY_SAVED_COMMENT),
          LocalStorage.getItem<string>(LS_KEY_SAVED_IS_BILLABLE) // Read as string first
        ]);


        console.log("Loaded initial values:", { initialProject, initialTask, initialComment });

        resetForm({
          customerProject: initialProject ?? "",
          task: initialTask ?? "",
          comment: initialComment ?? "",
          isBillable: true,
        });
      } catch (error) {
        console.error("Failed to load initial form values:", error);
        showToast(Toast.Style.Failure, "Failed to load saved form data");
        // Reset with defaults if loading fails
        resetForm({ customerProject: "", task: "", comment: "", isBillable: true });
      }
      isLoadingFormValues.current = false; // Mark loading as complete
    }
    loadInitialFormValues();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once

  // Effect: Sync form state changes BACK to LocalStorage
  useEffect(() => {
    // Don't run sync until initial values are loaded
    if (isLoadingFormValues.current) {
      return;
    }
    async function saveFormValues() {
      try {
        console.log("Syncing form values to LocalStorage:", formValues);
        await Promise.all([
          LocalStorage.setItem(LS_KEY_SAVED_PROJECT, formValues.customerProject),
          LocalStorage.setItem(LS_KEY_SAVED_TASK, formValues.task),
          LocalStorage.setItem(LS_KEY_SAVED_COMMENT, formValues.comment),
          LocalStorage.setItem(LS_KEY_SAVED_IS_BILLABLE, String(formValues.isBillable)) // Save boolean as string
        ]);
      } catch (error) {
        console.error("Failed to sync form values to LocalStorage:", error);
        // Optional: Show toast or handle error
      }
    }
    saveFormValues();
  }, [formValues]); // Run whenever formValues object changes

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
  }, [isRunning, lastStartTime, accumulatedSeconds]);

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
  }, [isRunning, lastStartTime, accumulatedSeconds]);

  // --- Timer Actions ---
  const handleStartTimer = useCallback(async () => {
    // Validation is now handled by useForm before onSubmit triggers
    // We only need to ensure project isn't empty conceptually before starting
    if (!formValues.customerProject) {
        showToast(Toast.Style.Failure, "Please enter a Customer/Project before starting.");
        // Optional: focus the field: focus('customerProject') // need to get focus from useForm return
        return;
    }
    const now = new Date();
    const nowTimestamp = now.getTime();
    setStartTimeStr(now.toISOString());
    setEndTime(null);
    await setAccumulatedSeconds(0);
    await setLastStartTime(nowTimestamp);
    await setIsRunning(true);
    showToast(Toast.Style.Success, "Timer Started");
  }, [formValues.customerProject, setAccumulatedSeconds, setLastStartTime, setIsRunning, setStartTimeStr]); // Include formValues.customerProject

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
    await setLastStartTime(null);

    // Calculate and set the endTime state when pausing
    const now = new Date();
    console.log("handlePauseTimer: Setting endTime state to", now);
    setEndTime(now);

    setDisplayTime(formatTime(finalAccumulated));
    showToast(Toast.Style.Success, "Timer Paused");
  }, [intervalId, lastStartTime, accumulatedSeconds, setAccumulatedSeconds, setLastStartTime, setIsRunning]);

  const handleResumeTimer = useCallback(async () => {
    if (!formValues.customerProject) {
        showToast(Toast.Style.Failure, "Please ensure Customer/Project is filled before resuming.");
        return;
    }
    if (!startTime) {
      showToast(Toast.Style.Failure, "Cannot resume without a start time.");
      return;
    }
    const nowTimestamp = Date.now();
    await setLastStartTime(nowTimestamp);
    await setIsRunning(true);
    setEndTime(null); 
    showToast(Toast.Style.Success, "Timer Resumed");
  }, [formValues.customerProject, startTime, setLastStartTime, setIsRunning]); // Include formValues.customerProject

  const handleResetTimer = useCallback(async () => {
    console.log("handleResetTimer called");
    if (intervalId) clearInterval(intervalId);
    setIntervalId(null);
    
    // Reset timer state
    await setIsRunning(false);
    await setAccumulatedSeconds(0);
    await setLastStartTime(null);
    setStartTimeStr(null); // Clear start time string state
    setEndTime(null);      // Clear local end time state
    setDisplayTime("00:00:00");

    // Reset form fields using useForm's reset
    const defaultFormValues = { customerProject: "", task: "", comment: "", isBillable: true };
    resetForm(defaultFormValues);
    // Sync effect will clear LocalStorage for form fields

    showToast(Toast.Style.Success, "Timer Reset");
    console.log("handleResetTimer finished");
  // Dependencies now include resetForm from useForm
  }, [intervalId, setIsRunning, setAccumulatedSeconds, setLastStartTime, setStartTimeStr, resetForm]);

  // --- Form Submission Logic ---
  async function submitTimeEntry(values: PapierkramFormValues) {
    console.log("handleFormSubmit called with values:", values);

    let currentAccumulated = accumulatedSeconds ?? 0;
    let finalStartTime = startTime; // Use derived Date object

    // If running, pause first to finalize accumulatedSeconds
    if (isRunning) {
       if (intervalId) clearInterval(intervalId);
       setIntervalId(null);
       if (lastStartTime) {
         const elapsed = Math.floor((Date.now() - lastStartTime) / 1000);
         currentAccumulated += elapsed;
         // No need to await setAccumulatedSeconds here, as we use currentAccumulated
       }
       await setIsRunning(false);
       await setLastStartTime(null);
       // Re-derive startTime just in case (though useMemo should handle it)
       finalStartTime = startTimeStr ? new Date(startTimeStr) : null;
       showToast(Toast.Style.Success, "Timer auto-paused for saving");
    }

    if (!finalStartTime) {
       showToast(Toast.Style.Failure, "Start time is missing.");
       return; // Return false or throw to prevent useForm clearing?
    }

    let finalEndTime : Date;
    if (endTime !== null) {
      finalEndTime = endTime;
    } else {
      finalEndTime = new Date(finalStartTime.getTime() + currentAccumulated * 1000);
    }

    if (finalEndTime.getTime() < finalStartTime.getTime()) {
        showToast(Toast.Style.Failure, "End time cannot be before start time.");
        return; // prevent submission
    }

    const submissionData: TimeEntryValues = {
        customerProject: values.customerProject,
        task: values.task,
        comment: values.comment,
        startTime: finalStartTime,
        endTime: finalEndTime,
        isBillable: values.isBillable,
      };

    const durationSeconds = Math.floor((finalEndTime.getTime() - finalStartTime.getTime()) / 1000);
    if (currentAccumulated > 0 && Math.abs(durationSeconds - currentAccumulated) > 1) {
         console.warn(`Mismatch between calculated duration (${durationSeconds}s) and accumulated timer (${currentAccumulated}s). Using calculated duration.`);
    }

    console.log("Form submitted with data:", submissionData);
    console.log("Final Duration (seconds):", durationSeconds);
    showToast(Toast.Style.Success, "Time Entry Submitted (Placeholder)");

    // Reset everything after successful placeholder submission
    await handleResetTimer();

    // TODO: Implement API call to Papierkram here using submissionData
  }

  return (
    <Form
      enableDrafts={false}
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
            {/* Use the handleSubmit from useForm here */}
            <Action.SubmitForm title="Save Time Entry" onSubmit={handleFormSubmit} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      // isLoading prop can be used if form loading takes time, e.g., fetching dropdown data
      // isLoading={isLoadingFormValues.current} // Example: show loading while fetching initial values
    >
      <Form.Description text={`Log Time for Papierkram - Elapsed: ${displayTime}`} />

      {/* Customer / Project Field - Use itemProps */}
      <Form.TextField
        title="Customer/Project"
        placeholder="Enter customer or project name"
        {...itemProps.customerProject} // Spread props from useForm
      />

      {/* Task Field - Use itemProps */}
      <Form.TextField
        title="Task"
        placeholder="Enter task description"
        {...itemProps.task} // Spread props from useForm
      />

      {/* Comment Field - Use itemProps */}
      <Form.TextArea
        title="Comment"
        placeholder="Enter comments (optional)"
        {...itemProps.comment} // Spread props from useForm
      />

      <Form.Separator />

      {/* Start Time Field - NOT managed by useForm, keep manual control */}
      <Form.DatePicker
        id="startTimePicker" // Different ID from form state
        title="Start Time"
        value={startTime} // Derived from useLocalStorage state
        onChange={(newValue) => {
          if (!isRunning) {
            setStartTimeStr(newValue ? newValue.toISOString() : null);
          }
        }}
      />

      {/* End Time Field - Conditionally render only when timer is NOT running */}
      {!isRunning && (
        <Form.DatePicker
          id="endTimePicker" // Different ID from form state
          title="End Time"
          value={endTime} // Local state
          onChange={(newValue) => {
            console.log(`End Time DatePicker onChange: newValue = ${newValue}, isRunning = ${isRunning}`);
            if (!isRunning) {
              console.log("Timer is not running, updating endTime state.");
              setEndTime(newValue);
            } else {
              console.log("Timer is running, preventing endTime update.");
            }
          }}
        />
      )}

      {/* Billable Checkbox - Use itemProps */}
      <Form.Checkbox
        label="Is this time entry billable?"
        title="Billable"
        {...itemProps.isBillable} // Spread props from useForm
      />
    </Form>
  );
}
