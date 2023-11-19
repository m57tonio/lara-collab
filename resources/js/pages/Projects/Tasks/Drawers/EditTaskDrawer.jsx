import Dropzone from "@/components/Dropzone";
import RichTextEditor from "@/components/RichTextEditor";
import useTaskDrawerStore from "@/hooks/store/useTaskDrawerStore";
import useTasksStore from "@/hooks/store/useTasksStore";
import { date } from "@/utils/date";
import { hasRoles } from "@/utils/user";
import { usePage } from "@inertiajs/react";
import {
  Breadcrumbs,
  Checkbox,
  Drawer,
  Group,
  MultiSelect,
  NumberInput,
  Select,
  Text,
  TextInput,
  rem,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import LabelsDropdown from "./LabelsDropdown";
import Timer from "./Timer";
import classes from "./css/TaskDrawer.module.css";

export function EditTaskDrawer() {
  const { edit, closeEditTask } = useTaskDrawerStore();
  const {
    findTask,
    updateTask,
    complete,
    deleteAttachment,
    uploadAttachments,
  } = useTasksStore();
  const {
    usersWithAccessToProject,
    taskGroups,
    labels,
    auth: { user },
  } = usePage().props;

  const task = findTask(edit.task.id);

  const [data, setData] = useState({
    group_id: "",
    assigned_to_user_id: "",
    name: "",
    description: "",
    estimation: "",
    due_on: "",
    hidden_from_clients: false,
    billable: true,
    subscribed_users: [],
    labels: [],
  });

  useEffect(() => {
    if (edit.opened)
      setData({
        group_id: task?.group_id || "",
        assigned_to_user_id: task?.assigned_to_user_id || "",
        name: task?.name || "",
        description: task?.description || "",
        estimation: task?.estimation || "",
        due_on: task?.due_on ? dayjs(task?.due_on).toDate() : "",
        hidden_from_clients: task?.hidden_from_clients || false,
        billable: task?.billable || true,
        subscribed_users: (task?.subscribed_users || []).map((i) =>
          i.id.toString(),
        ),
        labels: (task?.labels || []).map((i) => i.id),
      });
  }, [edit.opened]);

  const updateValue = (field, value) => {
    setData({ ...data, [field]: value });
  };

  const submit = () => {
    if (data.name.length > 0) {
      updateTask(task, data);
    }
  };

  return (
    <Drawer
      opened={edit.opened}
      onClose={closeEditTask}
      title={
        <Group ml={25} my="sm">
          <Checkbox
            size="md"
            radius="xl"
            color="green"
            checked={task?.completed_at !== null}
            onChange={(e) => complete(task, e.currentTarget.checked)}
            className={
              can("complete task") ? classes.checkbox : classes.disabledCheckbox
            }
          />
          <Text
            fz={rem(28)}
            fw={600}
            td={task?.completed_at !== null ? "line-through" : null}
            truncate="end"
          >
            #{task?.number}: {data.name}
          </Text>
        </Group>
      }
      position="right"
      size={1000}
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      transitionProps={{
        transition: "slide-left",
        duration: 400,
        timingFunction: "ease",
      }}
    >
      {task ? (
        <>
          <Breadcrumbs
            c="dimmed"
            ml={24}
            mb="xs"
            separator="I"
            separatorMargin="sm"
          >
            <Text size="xs">{task.project.name}</Text>
            <Text size="xs">Task #{task.number}</Text>
            <Text size="xs">
              Created by {task.created_by_user.name} on {date(task.created_at)}
            </Text>
          </Breadcrumbs>
          <form className={classes.inner}>
            <div className={classes.content}>
              <TextInput
                label="Name"
                placeholder="Task name"
                value={data.name}
                onChange={(e) => updateValue("name", e.target.value)}
                onBlur={submit}
                error={data.name.length === 0}
              />

              <RichTextEditor
                mt="xl"
                placeholder="Task description"
                content={data.description}
                onChange={(content) => updateValue("description", content)}
                onBlur={submit}
              />

              <Dropzone
                mt="xl"
                selected={task.attachments}
                onChange={(files) => uploadAttachments(task, files)}
                remove={(index) => deleteAttachment(task, index)}
              />
            </div>
            <div className={classes.sidebar}>
              <Select
                label="Task group"
                placeholder="Select task group"
                allowDeselect={false}
                value={data.group_id}
                onChange={(value) => updateValue("group_id", value)}
                onBlur={submit}
                data={taskGroups.map((i) => ({
                  value: i.id.toString(),
                  label: i.name,
                }))}
              />

              <Select
                label="Assignee"
                placeholder="Select assignee"
                searchable
                mt="md"
                value={data.assigned_to_user_id}
                onChange={(value) => updateValue("assigned_to_user_id", value)}
                onBlur={submit}
                data={usersWithAccessToProject.map((i) => ({
                  value: i.id.toString(),
                  label: i.name,
                }))}
              />

              <DateInput
                clearable
                valueFormat="DD MMM YYYY"
                minDate={new Date()}
                mt="md"
                label="Due date"
                placeholder="Pick task due date"
                value={data.due_on}
                onChange={(value) => updateValue("due_on", value)}
                onBlur={submit}
              />

              <LabelsDropdown
                items={labels}
                selected={data.labels}
                onChange={(values) => updateValue("labels", values)}
                onBlur={submit}
                mt="md"
              />

              <NumberInput
                label="Time estimation"
                mt="md"
                decimalScale={2}
                fixedDecimalScale
                value={data.estimation}
                min={0}
                allowNegative={false}
                step={0.5}
                suffix=" hours"
                onChange={(value) => updateValue("estimation", value)}
                onBlur={submit}
              />

              <Timer mt="xl" task={task} />

              <Checkbox
                label="Billable"
                mt="xl"
                checked={data.billable}
                onChange={(event) =>
                  updateValue("billable", event.currentTarget.checked)
                }
                onBlur={submit}
              />

              {!hasRoles(user, ["client"]) && (
                <Checkbox
                  label="Hidden from clients"
                  mt="md"
                  checked={data.hidden_from_clients}
                  onChange={(event) =>
                    updateValue(
                      "hidden_from_clients",
                      event.currentTarget.checked,
                    )
                  }
                  onBlur={submit}
                />
              )}

              <MultiSelect
                label="Subscribers"
                placeholder={
                  !data.subscribed_users.length ? "Select subscribers" : null
                }
                mt="lg"
                value={data.subscribed_users}
                onChange={(values) => updateValue("subscribed_users", values)}
                onBlur={submit}
                data={usersWithAccessToProject.map((i) => ({
                  value: i.id.toString(),
                  label: i.name,
                }))}
              />
            </div>
          </form>
        </>
      ) : (
        <></>
      )}
    </Drawer>
  );
}