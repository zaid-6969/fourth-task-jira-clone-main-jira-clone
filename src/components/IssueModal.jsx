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
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebase";
import style from "../styles/btn.module.scss";

const IssueModal = ({
  item,
  projectName,
  projectId,
  columns,
  onClose,
  onUpdate,
}) => {
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
  const [currentTicket, setCurrentTicket] = useState(item);

  const [activeActivityTab, setActiveActivityTab] = useState("Comments");
  const [activityOpen, setActivityOpen] = useState(true);
  const [showDetails, setShowDetails] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    if (!item?.id) return;

    const ticketRef = doc(db, "tickets", item.id);
    const unsubscribe = onSnapshot(ticketRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const updatedTicket = { id: item.id, ...data };

        setCurrentTicket(updatedTicket);
        setSummaryHTML(data.summary || "");
        setDescriptionHTML(data.description || "");
      }
    });

    return () => unsubscribe();
  }, [item.id]);

  useEffect(() => {
    setEditSummary(false);
    setEditDescription(false);
    summaryQuill.current = null;
    descriptionQuill.current = null;
  }, [item.id]);

  const updateIssue = async (data) => {
    await updateDoc(doc(db, "tickets", item.id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });

    await onUpdate({ id: item.id, ...data });

    if (data.summary !== undefined) setSummaryHTML(data.summary);
    if (data.description !== undefined) setDescriptionHTML(data.description);
  };

  useEffect(() => {
    if (editSummary && summaryRef.current && !summaryQuill.current) {
      summaryQuill.current = new Quill(summaryRef.current, {
        theme: "snow",
        placeholder: "Add a summary…",
      });
      summaryQuill.current.root.innerHTML = summaryHTML;
    }
  }, [editSummary, summaryHTML]);

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
  }, [editDescription, descriptionHTML]);

  const saveSummary = async () => {
    if (!summaryQuill.current) return;

    const html = summaryQuill.current.getSemanticHTML();
    setEditSummary(false);
    summaryQuill.current = null;

    await updateIssue({ summary: html });
  };

  const saveDescription = async () => {
    if (!descriptionQuill.current) return;

    const html = descriptionQuill.current.getSemanticHTML();
    setEditDescription(false);
    descriptionQuill.current = null;

    await updateIssue({ description: html });
  };

  return (
    <div className="issue-overlay">
      <div className={`issue-container ${compact ? "compact" : ""}`}>
        <div className="issue-header">
          <h1>{currentTicket.content}</h1>

          <div className="issue-actions">
            <button
              className="re-direct-btn"
              onClick={() => {
                navigate(
                  `/projects/${currentTicket.projectId}/issues/${currentTicket.id}`,
                );
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

        <div className="issue-body">
          <div className="issue-content">
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
                    <button
                      className={style["create-btn"]}
                      type="button"
                      onClick={saveSummary}
                    >
                      Save
                    </button>
                    <button
                      className={style["create-btn"]}
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
                    <button
                      className={style["create-btn"]}
                      type="button"
                      onClick={saveDescription}
                    >
                      Save
                    </button>
                    <button
                      className={style["create-btn"]}
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
                  <IssueAllActivity issueId={currentTicket.id} />
                )}
                {activeActivityTab === "Comments" && (
                  <IssueComments issueId={currentTicket.id} />
                )}
                {activeActivityTab === "History" && (
                  <IssueActivity issueId={currentTicket.id} />
                )}
              </>
            )}
          </div>

          {/* RIGHT */}
          <div className="issue-sidebar">
            <div className="issue-meta">
              <label>Status</label>
              <select
                value={currentTicket.columnId}
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
                      {currentTicket.createdByName || "Unknown"}
                    </div>
                  </div>

                  <div className="issue-meta">
                    <label>Project</label>
                    <div className="issue-meta-value">{projectName}</div>
                  </div>

                  <div className="issue-meta">
                    <label>Created</label>
                    <div className="issue-meta-value">
                      {currentTicket.createdAt
                        ? new Date(currentTicket.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                            },
                          )
                        : "—"}
                    </div>
                  </div>

                  {/* START DATE */}
                  <div className="issue-meta">
                    <label>Start date</label>
                    <div className="issue-meta-value">
                      {currentTicket.startDate
                        ? new Date(currentTicket.startDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                            },
                          )
                        : "—"}
                    </div>
                  </div>

                  {/* DUE DATE */}
                  <div className="issue-meta">
                    <label>Due date</label>
                    <div className="issue-meta-value">
                      {currentTicket.dueDate
                        ? new Date(currentTicket.dueDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                            },
                          )
                        : "—"}
                    </div>
                  </div>

                  <div className="issue-meta">
                    <label>Reporter</label>
                    <div className="issue-meta-value">
                      {currentTicket.createdByName || "none"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="issue-footer">
          <button className={style["create-btn"]} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default IssueModal;
