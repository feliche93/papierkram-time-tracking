import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";

// Define the structure for the form values
interface TimeEntryValues {
  customerProject: string;
  task: string;
  comment: string;
  startTime: Date | null;
  // endTime: Date | null; // Consider adding end time later
  isBillable: boolean;
}

// Main command component
export default function PapierkramTimeTrackingCommand() {
  // State for validation errors
  const [customerProjectError, setCustomerProjectError] = useState<string | undefined>();

  // Validation function for the Customer/Project field
  function validateCustomerProject(value: string | undefined) {
    if (value && value.length > 0) {
      setCustomerProjectError(undefined);
    } else {
      setCustomerProjectError("Customer/Project cannot be empty");
    }
  }

  // Function to handle form submission
  function handleSubmit(values: TimeEntryValues) {
    // Basic validation check before proceeding
    if (!values.customerProject) {
      showToast(Toast.Style.Failure, "Customer/Project is required.");
      return;
    }

    // Placeholder for actual submission logic
    console.log("Form submitted with values:", values);
    showToast(Toast.Style.Success, "Time Entry Submitted (Placeholder)");
    // TODO: Implement API call to Papierkram here
    // Example: await api.createTimeEntry(values);
  }

  // Render the form UI
  return (
    <Form
      actions={
        <ActionPanel>
          {/* Submit action */}
          <Action.SubmitForm title="Save Time Entry" onSubmit={handleSubmit} />
          {/* TODO: Add other actions like Cancel or Delete if needed */}
        </ActionPanel>
      }
    >
      <Form.Description text="Log Time for Papierkram" />

      {/* Customer / Project Field */}
      <Form.TextField
        id="customerProject"
        title="Customer/Project"
        placeholder="Enter customer or project name"
        error={customerProjectError}
        onChange={validateCustomerProject} // Validate on change
        onBlur={(event) => validateCustomerProject(event.target.value)} // Re-validate on blur
      />

      {/* Task Field */}
      <Form.TextField
        id="task"
        title="Task"
        placeholder="Enter task description"
      />

      {/* Comment Field */}
      <Form.TextArea
        id="comment"
        title="Comment"
        placeholder="Enter comments (optional)"
      />

      <Form.Separator />

      {/* Start Time Field */}
      <Form.DatePicker
        id="startTime"
        title="Start Time"
        defaultValue={new Date()} // Default to the current time
      />
      {/* TODO: Consider adding an end time DatePicker */}

      {/* Billable Checkbox */}
      <Form.Checkbox
        id="isBillable"
        label="Is this time entry billable?"
        title="Billable"
        defaultValue={true} // Default to true (Yes)
      />

      {/* TODO: Implement Timer, Play Button, and Sidebar/List view separately */}
    </Form>
  );
}
