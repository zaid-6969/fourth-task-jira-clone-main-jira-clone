import React, { useEffect, useRef, useState } from "react";
import { ImCross } from "react-icons/im";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import "../styles/issueModal.scss";
import IssueComments from "./IssueComments";
import ActivityTabs from "./ActivityTabs";
import IssueActivity from "./IssueActivity";
import IssueAllActivity from "./IssueAllActivity";
import { FiMaximize2, FiMinimize2 } from "react-icons/fi";
import { MdOutlineArrowOutward } from "react-icons/md";
import { useNavigate } from "react-router-dom";

const IssueModal = ({ item, projectName, columns, onClose, onUpdate }) => {
  if (!item) return null;

  const summaryRef = useRef(null);
  const descriptionRef = useRef(null);

  const summaryQuill = useRef(null);
  const descriptionQuill = useRef(null);

  const [editSummary, setEditSummary] = useState(false);
  const [editDescription, setEditDescription] = useState(false);
  const [compact, setCompact] = useState(false);

  const [summaryHTML, setSummaryHTML] = useState("");
  const [descriptionHTML, setDescriptionHTML] = useState("");

  const [activeActivityTab, setActiveActivityTab] = useState("Comments");
  const [activityOpen, setActivityOpen] = useState(true);
  const [showDetails, setShowDetails] = useState(true);

  const navigate = useNavigate();

  /* 🔄 Sync when issue changes */
  useEffect(() => {
    setSummaryHTML(item.summary || "");
    setDescriptionHTML(item.description || "");
    setEditSummary(false);
    setEditDescription(false);

    summaryQuill.current = null;
    descriptionQuill.current = null;
  }, [item.id]);

  /* 🔐 Update through parent */
  const updateIssue = async (data) => {
    await onUpdate({ id: item.id, ...data });

    if (data.summary !== undefined) setSummaryHTML(data.summary);
    if (data.description !== undefined) setDescriptionHTML(data.description);
  };

  /* 📝 Init Quill ONLY when editor mounts */
  useEffect(() => {
    if (editSummary && summaryRef.current && !summaryQuill.current) {
      summaryQuill.current = new Quill(summaryRef.current, {
        theme: "snow",
        placeholder: "Add a summary…",
      });
      summaryQuill.current.root.innerHTML = summaryHTML;
    }
  }, [editSummary]);

  useEffect(() => {
    if (
      editDescription &&
      descriptionRef.current &&
      !descriptionQuill.current
    ) {
      descriptionQuill.current = new Quill(descriptionRef.current, {
        theme: "snow",
        placeholder: "Add a description…",
      });
      descriptionQuill.current.root.innerHTML = descriptionHTML;
    }
  }, [editDescription]);

  const saveSummary = async () => {
    if (!summaryQuill.current) return;

    const html = summaryQuill.current.getSemanticHTML();
    setEditSummary(false);
    summaryQuill.current = null;
    setSummaryHTML(html);
    await updateIssue({ summary: html });
  };

  const saveDescription = async () => {
    if (!descriptionQuill.current) return;

    const html = descriptionQuill.current.getSemanticHTML();
    setEditDescription(false);
    descriptionQuill.current = null;
    setDescriptionHTML(html);
    await updateIssue({ description: html });
  };

  return (
    <div className="issue-overlay">
      <div className={`issue-container ${compact ? "compact" : ""}`}>
        {/* HEADER */}
        <div className="issue-header">
          <h1>{item.content}</h1>

          <div className="issue-actions">
            <button
              className="re-direct-btn"
              onClick={() => {
                navigate(`/projects/${item.projectId}/issues/${item.id}`);
                onClose();
              }}
            >
              <MdOutlineArrowOutward />
            </button>

            <button
              className="resize-btn"
              onClick={() => setCompact((p) => !p)}
            >
              {compact ? <FiMaximize2 /> : <FiMinimize2 />}
            </button>

            <button className="close-btn" onClick={onClose}>
              <ImCross />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="issue-body">
          {/* LEFT */}
          <div className="issue-content">
            {/* SUMMARY */}
            <div className="issue-group">
              <label>Summary</label>

              {!editSummary && (
                <div
                  className="issue-view"
                  dangerouslySetInnerHTML={{
                    __html:
                      summaryHTML ||
                      "<span class='muted'>Click to add summary</span>",
                  }}
                  onClick={() => setEditSummary(true)}
                />
              )}

              {editSummary && (
                <>
                  <div ref={summaryRef} className="issue-editor" />
                  <div className="inline-actions">
                    <button type="button" onClick={saveSummary}>
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditSummary(false);
                        summaryQuill.current = null;
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* DESCRIPTION */}
            <div className="issue-group">
              <label>Description</label>

              {!editDescription && (
                <div
                  className="issue-view"
                  dangerouslySetInnerHTML={{
                    __html:
                      descriptionHTML ||
                      "<span class='muted'>Click to add description</span>",
                  }}
                  onClick={() => setEditDescription(true)}
                />
              )}

              {editDescription && (
                <>
                  <div ref={descriptionRef} className="issue-editor" />
                  <div className="inline-actions">
                    <button type="button" onClick={saveDescription}>
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditDescription(false);
                        descriptionQuill.current = null;
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* ACTIVITY */}
            <ActivityTabs
              activeTab={activeActivityTab}
              onTabChange={setActiveActivityTab}
              onToggle={setActivityOpen}
            />

            {activityOpen && (
              <>
                {activeActivityTab === "All" && (
                  <IssueAllActivity issueId={item.id} />
                )}
                {activeActivityTab === "Comments" && (
                  <IssueComments issueId={item.id} />
                )}
                {activeActivityTab === "History" && (
                  <IssueActivity issueId={item.id} />
                )}
              </>
            )}
          </div>

          {/* RIGHT */}
          <div className="issue-sidebar">
            <div className="issue-meta">
              <label>Status</label>
              <select
                value={item.columnId}
                onChange={async (e) => {
                  const col = columns.find((c) => c.id === e.target.value);
                  if (!col) return;
                  await updateIssue({
                    columnId: col.id,
                    columnTitle: col.title,
                  });
                }}
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="issue-details">
              <div
                className="issue-details-header"
                onClick={() => setShowDetails((p) => !p)}
              >
                <span>Details</span>
                <span className={`arrow ${showDetails ? "open" : ""}`}>▸</span>
              </div>

              {showDetails && (
                <div className="issue-details-body">
                  <div className="issue-meta">
                    <label>Created by</label>
                    <div className="issue-meta-value">
                      {item.createdByName || "Unknown"}
                    </div>
                  </div>

                   <div className="issue-meta">
                    <label>Project</label>
                    <div className="issue-meta-value">{projectName}</div>
                  </div>

                  <div className="issue-meta">
                    <label>Created</label>
                    <div className="issue-meta-value">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                          })
                        : "—"}
                    </div>
                  </div>

                  {/* ✅ START DATE (ADDED) */}
                  <div className="issue-meta">
                    <label>Start date</label>
                    <div className="issue-meta-value">
                      {item.startDate
                        ? new Date(item.startDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                          })
                        : "—"}
                    </div>
                  </div>

                  {/* ✅ DUE DATE (ADDED) */}
                  <div className="issue-meta">
                    <label>Due date</label>
                    <div className="issue-meta-value">
                      {item.dueDate
                        ? new Date(item.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                          })
                        : "—"}
                    </div>
                  </div>

                  <div className="issue-meta">
                    <label>Reporter</label>
                    {item.createdByName || "none"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="issue-footer">
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default IssueModal;
