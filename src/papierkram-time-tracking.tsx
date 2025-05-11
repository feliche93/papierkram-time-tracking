import { ActionPanel, Action, Form } from "@raycast/api";
import { useMemo, useState } from "react";
import { useLocalStorage, useForm, FormValidation } from "@raycast/utils";
import { formatDuration } from "date-fns";
import { Icon, List } from "@raycast/api";
import TimerActionPanel from "./components/TimerActionPanel";

// Define the structure for the form values managed by useForm
export interface TPapierkramForm {
  customerProject: string;
  task: string;
  comment: string;
  isBillable: boolean;
  startTime: Date | null;
  endTime: Date | null;
}

// --- Timer State (Managed by useLocalStorage & useState) ---

// Main command component
export default function PapierkramTimeTrackingCommand() {
  // --- Timer State (Managed by useLocalStorage & useState) ---
  const { value: localStorageValues, setValue: setLocalStorageValues } =
    useLocalStorage<TPapierkramForm>("papierkram-time-tracking");

  // --- Form State (Managed by useForm) ---
  const {
    handleSubmit: handleFormSubmit,
    itemProps,
    values: formValues,
    reset: resetForm,
    setValue: setFormValues,
  } = useForm<TPapierkramForm>({
    onSubmit(values) {
      console.log("handleFormSubmit", values);
    },
    validation: {
      customerProject: FormValidation.Required,
    },
    initialValues: localStorageValues,
    // initialValues will be set via effect after loading from LocalStorage
  });

  const [timerState, setTimerState] = useState<"running" | "paused" | "stopped">("stopped");

  const handleStartTimer = async () => {
    setTimerState("running");
    let startTime = new Date();
    if (localStorageValues?.startTime) {
      startTime = localStorageValues.startTime;
      setFormValues("startTime", startTime);
    }
    await setLocalStorageValues({ ...formValues, startTime });
    console.log("handleStartTimer");
  };

  const handlePauseTimer = () => {
    setTimerState("paused");
    console.log("handlePauseTimer");
  };

  const handleResumeTimer = () => {
    setTimerState("running");
    console.log("handleResumeTimer");
  };

  const handleStopTimer = () => {
    setTimerState("stopped");
    console.log("handleStopTimer");
  };

  const handleResetTimer = () => {
    setTimerState("stopped");
    console.log("handleResetTimer");
  };

  return (
    <Form
      enableDrafts={false}
      actions={
        <TimerActionPanel
          timerState={timerState}
          onStart={handleStartTimer}
          onPause={handlePauseTimer}
          onResume={handleResumeTimer}
          onStop={handleStopTimer}
          onSubmitEntry={handleFormSubmit}
        />
      }
      // isLoading prop can be used if form loading takes time, e.g., fetching dropdown data
      // isLoading={isLoadingFormValues.current} // Example: show loading while fetching initial values
    >
      <Form.Description text={`Log Time for Papierkram`} />

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

      {/* Billable Checkbox - Use itemProps */}
      <Form.Checkbox
        label="Is this time entry billable?"
        title="Billable"
        {...itemProps.isBillable} // Spread props from useForm
      />

      <Form.Separator />
      {timerState !== "running" && (
        <>
          {/* Start Time Field - NOT managed by useForm, keep manual control */}
          <Form.DatePicker
            title="Start Time"
            {...itemProps.startTime} // Spread props from useForm
          />

          {/* End Time Field - Conditionally render only when timer is NOT running */}
          <Form.DatePicker
            title="End Time"
            {...itemProps.endTime} // Spread props from useForm
          />
        </>
      )}
    </Form>
  );
}
