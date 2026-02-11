import React from "react";
import { useSelector } from "react-redux";
import "../styles/WorkTable.scss";
import { FaCheck } from "react-icons/fa6";

const ProjectWorkTable = ({ variant = "space" }) => {
  /* ============================================================
     GET DATA FROM REDUX
  ============================================================ */

  const columns = useSelector((state) => state.kanban.columns);

  // 👇 CHANGE THIS IF YOUR SPACE SLICE NAME IS DIFFERENT
  const spaceName = useSelector(
    (state) => state.space?.currentSpace?.name
  );

  /* ============================================================
     FLATTEN ALL TASKS
  ============================================================ */

  const allTasks = columns.flatMap((col) => col.items);

  /* ============================================================
     GENERATE GLOBAL ISSUE KEY (DEV-1, DEV-2...)
  ============================================================ */

  const tasks = allTasks.map((item, index) => ({
    ...item,
    columnTitle:
      columns.find((col) =>
        col.items.some((task) => task.id === item.id)
      )?.title || "",
    issueKey: item.issueKey || `DEV-${index + 1}`,
  }));

  if (tasks.length === 0) {
    return <p style={{ padding: 16 }}>No tasks yet</p>;
  }

  return (
    <div className={`worktable-container ${variant}`}>
      {variant === "space" ? (
        <SpaceTable tasks={tasks} />
      ) : (
        <UserList tasks={tasks} spaceName={spaceName} />
      )}
    </div>
  );
};

export default ProjectWorkTable;

/* ============================================================
   🚀 SPACE TABLE (JIRA STYLE)
============================================================ */

const SpaceTable = ({ tasks }) => {
  return (
    <table className="worktable space-table">
      <thead>
        <tr>
          <th></th>
          <th>Work</th>
          <th>Assignee</th>
          <th>Reporter</th>
          <th>Priority</th>
          <th>Status</th>
          <th>Resolution</th>
          <th>Created</th>
        </tr>
      </thead>

      <tbody>
        {tasks.map((task) => (
          <tr key={task.id}>
            <td>
              <input type="checkbox" />
            </td>

            <td className="work-cell">
              <span className="task-key">{task.issueKey}</span>
              <span className="task-title">{task.content}</span>
            </td>

            <td>{task.assignee || "Unassigned"}</td>

            <td>{task.createdByName || "Unknown"}</td>

            <td>
              <span className="priority medium">
                {task.priority || "Medium"}
              </span>
            </td>

            <td>
              <span className={`status ${task.columnTitle.toLowerCase()}`}>
                {task.columnTitle}
              </span>
            </td>

            <td>Unresolved</td>

            <td>
              {task.createdAt
                ? new Date(task.createdAt).toLocaleString()
                : "-"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

/* ============================================================
   👤 USER PAGE LIST (ACTIVITY STYLE)
============================================================ */

const UserList = ({ tasks, spaceName }) => {
  return (
    <div className="user-list">
      {tasks.map((task) => (
        <div key={task.id} className="user-list-item">
          <div className="left">
            <span style={{width:'18px' , height :'18px'}} className="checkbox-box">
              <FaCheck style={{fontSize:'16px'}} className="checkbox-icon" />
            </span>

            <div>
              <div className="title">{task.content}</div>

              <div className="meta">
                <span>
                  {task.issueKey} 
                </span>
              </div>
            </div>
          </div>

          <div className="right">
            {task.createdAt
              ? new Date(task.createdAt).toLocaleDateString()
              : "-"}
          </div>
        </div>
      ))}
    </div>
  );
};
