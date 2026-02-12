import React from "react";
import { useSelector } from "react-redux";
import "../styles/WorkTable.scss";
import { FaCheck } from "react-icons/fa6";

const ProjectWorkTable = ({ variant = "space" }) => {

  const columns = useSelector((state) => state.kanban.columns);

  const spaceName = useSelector(
    (state) => state.space?.currentSpace?.name
  );

  if (!columns || columns.length === 0) {
    return <p style={{ padding: 16 }}>No tasks yet</p>;
  }

  /* ============================================
     COLLECT ALL TASKS FROM KANBAN
  ============================================ */

  const tasks = columns.flatMap((col, colIndex) =>
    (col.items || []).map((item, index) => ({
      ...item,
      columnTitle: col.title,
      issueKey: item.issueKey || `DEV-${colIndex + 1}${index + 1}`,
      spaceName: spaceName || "Unknown Space",
    }))
  );

  if (tasks.length === 0) {
    return <p style={{ padding: 16 }}>No tasks yet</p>;
  }

  return (
    <div className={`worktable-container ${variant}`}>
      {variant === "space" ? (
        <SpaceTable tasks={tasks} />
      ) : (
        <UserList tasks={tasks} />
      )}
    </div>
  );
};

export default ProjectWorkTable;

/* =======================================================
   ✅ SPACE TABLE (UNCHANGED)
======================================================= */

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

            <td style={{ padding: "16px" }} className="work-cell">
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

/* =======================================================
   ✅ USER LIST (NOW GUARANTEED TO SHOW)
======================================================= */

const UserList = ({ tasks }) => {
  return (
    <div className="user-list">
      {tasks.map((task) => (
        <div key={task.id} className="user-list-item">
          <div className="left">
            <span
              style={{ width: "18px", height: "18px" }}
              className="checkbox-box"
            >
              <FaCheck
                style={{ fontSize: "16px" }}
                className="checkbox-icon"
              />
            </span>

            <div>
              <div className="title">{task.content}</div>

              <div className="meta">
                <span>{task.issueKey}</span>
                <span style={{ marginLeft: "10px", opacity: 0.6 }}>
                  {task.spaceName}
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
