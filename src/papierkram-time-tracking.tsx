import { ActionPanel, Action, Form } from "@raycast/api";
import { useMemo, useState, useEffect } from "react";
import { useLocalStorage, useForm, FormValidation } from "@raycast/utils";
import { formatDuration } from "date-fns";
import { Icon, List } from "@raycast/api";
import TimerActionPanel from "./components/TimerActionPanel";

// Define the structure for the form values managed by useForm
export interface TPapierkramForm {
  customerProjectId: string | null;
  taskId: string | null;
  comment: string;
  isBillable: boolean;
  startTime: Date | null;
  endTime: Date | null;
  persistedTimerState?: "running" | "stopped"; // Added for state persistence
} 


// --- Placeholder Types for API data ---
export interface PapierkramProject {
  id: string;
  name: string;
  customerName?: string;
}

export interface PapierkramTask {
  id: string;
  name: string;
  projectId: string;
}

// --- Timer State (Managed by useLocalStorage & useState) ---

// Main command component
export default function PapierkramTimeTrackingCommand() {

  const { value: localStorageValues, setValue: setLocalStorageValues, isLoading, removeValue } =
    useLocalStorage<TPapierkramForm>("papierkram-time-tracking");

  const {
    handleSubmit: handleFormSubmit,
    itemProps,
    values: formValues,
    reset: resetForm,
    setValue: setFormValues,
  } = useForm<TPapierkramForm>({
    onSubmit(values) {
      const submissionValues = {
        ...values,
        customerProjectId: values.customerProjectId === "" ? null : values.customerProjectId,
        taskId: values.taskId === "" ? null : values.taskId,
      };
    },
    validation: {
      customerProjectId: FormValidation.Required,
    },
    initialValues: localStorageValues,
  });

  useEffect(() => {
    console.log("DEBUG: useEffect - localStorageValues:", localStorageValues);
    setFormValues("taskId", localStorageValues?.taskId || "");  
    setFormValues("customerProjectId", localStorageValues?.customerProjectId || "");
    setFormValues("comment", localStorageValues?.comment || "");
    setFormValues("isBillable", localStorageValues?.isBillable || false);
    setFormValues("startTime", localStorageValues?.startTime || null);
    setFormValues("endTime", localStorageValues?.endTime || null);
    setFormValues("persistedTimerState", localStorageValues?.persistedTimerState || "stopped");
  }, [localStorageValues]);



  const handleStartTimer = async () => {
    const startTimeToSet = formValues.startTime instanceof Date ? formValues.startTime : new Date();
    console.log("DEBUG: handleStartTimer - startTimeToSet:", startTimeToSet);
    await setLocalStorageValues({
      ...formValues,
      startTime: startTimeToSet,
      endTime: null,
      persistedTimerState: "running",
    });
  };

  const handleResumeTimer = async () => {
    await setLocalStorageValues({
      ...formValues,
      persistedTimerState: "running",
    });
  };

  const handleStopTimer = async () => {
    await setLocalStorageValues({
      ...formValues,
      endTime: new Date(),
      persistedTimerState: "stopped",
    });
  };

  return (
    <Form
      enableDrafts={false}
      actions={
        <TimerActionPanel
          timerState={localStorageValues?.persistedTimerState}
          onStart={handleStartTimer}
          onResume={handleResumeTimer}
          onStop={handleStopTimer}
          onSubmitEntry={handleFormSubmit}
        />
      }
    >
      <Form.Description text={`Log Time for Papierkram`} />

      <Form.Dropdown
        title="Customer/Project"
        placeholder="Select customer or project"
        id={itemProps.customerProjectId.id}
        value={formValues.customerProjectId || ""}
        error={itemProps.customerProjectId.error}
        onChange={(newValue) => {
          setFormValues("customerProjectId", newValue || "");
          setFormValues("taskId", "");
        }}
        isLoading={isLoading}
      >
        <Form.Dropdown.Item value="" title="Select a Project" />
        {[{
          id: "1",
          name: "Project 1",
          customerName: "Customer 1"
        }, {
          id: "2",
          name: "Project 2",
          customerName: "Customer 2"
        }].map((project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={project.id}
            title={project.customerName ? `${project.name} (${project.customerName})` : project.name}
          />
        ))}
      </Form.Dropdown>

      {formValues.customerProjectId && (
        <Form.Dropdown
          title="Task"
          placeholder="Select task"
          id={itemProps.taskId.id}
          value={formValues.taskId || ""}
          error={itemProps.taskId.error}
          onChange={(newValue) => {
            setFormValues("taskId", newValue || "");
          }}
          isLoading={isLoading}
        >
          <Form.Dropdown.Item value="" title="Select a Task (Optional)" />
          {[{
            id: "1",
            name: "Task 1"
          }, {
            id: "2",
            name: "Task 2"
          }].map((task) => (
            <Form.Dropdown.Item key={task.id} value={task.id} title={task.name} />
          ))}
        </Form.Dropdown>
      )}

      <Form.TextArea
        title="Comment"
        placeholder="Enter comments (optional)"
        {...itemProps.comment}
      />

      <Form.Checkbox
        label="Is this time entry billable?"
        title="Billable"
        {...itemProps.isBillable}
      />

      <Form.Separator />
      {formValues.persistedTimerState !== "running" && (
        <>
          <Form.DatePicker
            title="Start Time"
            {...itemProps.startTime}
          />
          {localStorageValues?.persistedTimerState === "stopped" && (
            <Form.DatePicker
              title="End Time"
              {...itemProps.endTime}
            />
          )}
        </>
      )}
    </Form>
  );
}
