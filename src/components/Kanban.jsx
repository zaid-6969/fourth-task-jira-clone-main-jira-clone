import React, { useEffect, useRef, useState } from "react";
import Column from "./Column";
import "../styles/kanbaborad.scss";
import { FiPlus } from "react-icons/fi";

import {
  doc,
  serverTimestamp,
  onSnapshot,
  setDoc,
  getDoc,
  addDoc,
  collection,
  updateDoc,
} from "firebase/firestore";
import { useDispatch, useSelector } from "react-redux";
import { setColumns } from "../store/kanbanSlice";

import { db } from "../firebase/firebase";
import { useAuth } from "../auth/AuthProvider";

const DEFAULT_COLUMNS = [
  { id: "todo", title: "To Do", items: [] },
  { id: "progress", title: "In Progress", items: [] },
  { id: "done", title: "Done", items: [] },
];

const Kanban = ({ projectId, projectName }) => {
  const dispatch = useDispatch();
  const { user, loading } = useAuth();

  const rawColumns = useSelector((state) => state.kanban.columns);
  const columns = rawColumns.length ? rawColumns : DEFAULT_COLUMNS;

  const loaded = useRef(false);
  const [showColumnInput, setShowColumnInput] = useState(false);
  const [columnTitle, setColumnTitle] = useState("");

  const [issueCounter, setIssueCounter] = useState(0);

  const [search, setSearch] = useState("");

  if (loading) return null;

  // refresh
  useEffect(() => {
    dispatch(setColumns([]));
    loaded.current = false;
  }, [projectId, dispatch]);

  useEffect(() => {
    if (!projectId) return;

    const ref = doc(db, "projects", projectId, "kanban", "board");

    const init = async () => {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, { columns: DEFAULT_COLUMNS });
      }
    };

    init();
  }, [projectId]);

  // load 
  useEffect(() => {
    if (!projectId) return;

    const ref = doc(db, "projects", projectId, "kanban", "board");

    const unsub = onSnapshot(ref, async (snap) => {
      if (snap.exists()) {
        const cols = snap.data().columns || [];

        let max = 0;
        cols.forEach((col) =>
          col.items.forEach((item) => {
            if (item.issueNumber && item.issueNumber > max) {
              max = item.issueNumber;
            }
          }),
        );

        setIssueCounter(max);
        dispatch(setColumns(cols));
        loaded.current = true;
      }
    });

    return () => unsub();
  }, [projectId, dispatch]);

  const addCard = async (columnId, content) => {
    const nextNumber = issueCounter + 1;

    // 1️⃣ Create ticket document FIRST with ALL data including projectId
    const ticketRef = await addDoc(collection(db, "tickets"), {
      issueNumber: nextNumber,
      issueKey: `${projectName}-${nextNumber}`,
      content,
      projectId,  // ✅ CRITICAL - needed for navigation
      columnId,
      columnTitle: columns.find((c) => c.id === columnId)?.title || "",
      summary: "",
      description: "",
      createdBy: user.uid,
      createdByName: user.displayName || user.email,
      createdAt: new Date().toISOString(),
    });

    console.log("✅ Created ticket:", ticketRef.id, "with projectId:", projectId);

    // 2️⃣ Create board item with same data INCLUDING projectId
    const updated = columns.map((col) =>
      col.id === columnId
        ? {
            ...col,
            items: [
              ...col.items,
              {
                id: ticketRef.id,
                issueNumber: nextNumber,
                issueKey: `${projectName}-${nextNumber}`,
                content,
                projectId,  // ✅ ADD THIS - needed for modal redirect
                summary: "",
                description: "",
                columnId,
                columnTitle: col.title,
                createdByName: user.displayName || user.email,
                createdAt: new Date().toISOString(),
              },
            ],
          }
        : col,
    );

    // 3️⃣ Update Redux
    dispatch(setColumns(updated));

    // 4️⃣ Update board document
    await updateDoc(doc(db, "projects", projectId, "kanban", "board"), {
      columns: updated,
    });

    setIssueCounter(nextNumber);
  };

  const logMoveActivity = async (issueId, from, to) => {
    if (!user) return;

    await addDoc(collection(db, "tickets", issueId, "activity"), {
      type: "move",
      from,
      to,
      userId: user.uid,
      userName: user.displayName || user.email,
      createdAt: serverTimestamp(),
    });
  };

  const moveCard = async (fromCol, toCol, card, fromIndex, toIndex) => {
    const updated = structuredClone(columns);

    const source = updated.find((c) => c.id === fromCol);
    const target = updated.find((c) => c.id === toCol);
    if (!source || !target) return;

    source.items.splice(fromIndex, 1);

    target.items.splice(toIndex, 0, {
      ...card,
      columnId: target.id,
      columnTitle: target.title,
    });
    
    dispatch(setColumns(updated));

    await updateDoc(doc(db, "projects", projectId, "kanban", "board"), {
      columns: updated,
    });

    if (source.id !== target.id) {
      await updateDoc(doc(db, "tickets", card.id), {
        columnId: target.id,
        columnTitle: target.title,
        updatedAt: new Date().toISOString(),
      });

      logMoveActivity(card.id, source.title, target.title);
    }
  };

  const moveColumn = async (fromIndex, toIndex) => {
    const updated = [...columns];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    dispatch(setColumns(updated));

    await updateDoc(doc(db, "projects", projectId, "kanban", "board"), {
      columns: updated,
    });
  };

  const renameColumn = async (columnId, newTitle) => {
    const updated = columns.map((col) =>
      col.id === columnId ? { ...col, title: newTitle } : col,
    );

    dispatch(setColumns(updated));

    await updateDoc(doc(db, "projects", projectId, "kanban", "board"), {
      columns: updated,
    });
  };

  const deleteColumn = async (columnId) => {
    const updated = columns.filter((col) => col.id !== columnId);

    dispatch(setColumns(updated));

    await updateDoc(doc(db, "projects", projectId, "kanban", "board"), {
      columns: updated,
    });
  };

  const updateIssue = async (updatedItem) => {
    const updated = structuredClone(columns);

    let sourceCol = null;
    let index = -1;

    for (const col of updated) {
      index = col.items.findIndex((c) => c.id === updatedItem.id);
      if (index !== -1) {
        sourceCol = col;
        break;
      }
    }

    if (!sourceCol) return;

    if (updatedItem._action === "delete") {
      sourceCol.items.splice(index, 1);

      dispatch(setColumns(updated));

      await updateDoc(doc(db, "projects", projectId, "kanban", "board"), {
        columns: updated,
      });

      await updateDoc(doc(db, "tickets", updatedItem.id), {
        deleted: true,
        deletedAt: new Date().toISOString(),
      });

      return;
    }

    const card = sourceCol.items[index];

    if (updatedItem.columnId && updatedItem.columnId !== card.columnId) {
      sourceCol.items.splice(index, 1);

      const target = updated.find((c) => c.id === updatedItem.columnId);
      if (!target) return;

      target.items.push({
        ...card,
        ...updatedItem,
        columnTitle: target.title,
      });

      dispatch(setColumns(updated));

      await updateDoc(doc(db, "projects", projectId, "kanban", "board"), {
        columns: updated,
      });

      // 3. Update ticket document (SOURCE OF TRUTH)
      await updateDoc(doc(db, "tickets", updatedItem.id), {
        columnId: updatedItem.columnId,
        columnTitle: target.title,
        updatedAt: new Date().toISOString(),
      });

      await addDoc(collection(db, "tickets", updatedItem.id, "activity"), {
        type: "move",
        from: sourceCol.title,
        to: target.title,
        userId: user.uid,
        userName: user.displayName || user.email,
        createdAt: serverTimestamp(),
      });
    } else {
      sourceCol.items[index] = {
        ...card,
        ...updatedItem,
      };

      dispatch(setColumns(updated));

      await updateDoc(doc(db, "projects", projectId, "kanban", "board"), {
        columns: updated,
      });

      await updateDoc(doc(db, "tickets", updatedItem.id), {
        ...updatedItem,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const filteredColumns = columns.map((col) => {
    if (!search.trim()) return col;

    const query = search.toLowerCase();

    return {
      ...col,
      items: col.items.filter(
        (item) =>
          item.content?.toLowerCase().includes(query) ||
          item.summary?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.createdByName?.toLowerCase().includes(query) ||
          `dev-${col.items.indexOf(item) + 1}`.includes(query),
      ),
    };
  });

  return (
    <>
      <div className="kanban-search">
        <input
          type="text"
          placeholder="Search issues…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="kanban-board">
        {filteredColumns.map((col, index) => (
          <Column
            key={col.id}
            column={col}
            index={index}
            moveCard={moveCard}
            moveColumn={moveColumn}
            addCard={addCard}
            projectName={projectName}
            projectId={projectId}
            columns={columns}
            updateIssue={updateIssue}
            renameColumn={renameColumn}
            deleteColumn={deleteColumn}
          />
        ))}

        {/* ADD COLUMN */}
        <div className="add-column">
          {showColumnInput ? (
            <div>
              <input
                value={columnTitle}
                onChange={(e) => setColumnTitle(e.target.value)}
                autoFocus
              />
              <button
                onClick={async () => {
                  if (!columnTitle.trim()) return;

                  const updated = [
                    ...columns,
                    {
                      id: Date.now().toString(),
                      title: columnTitle,
                      items: [],
                    },
                  ];

                  // 1. Update Redux first
                  dispatch(setColumns(updated));

                  // 2. Update Firestore
                  await updateDoc(
                    doc(db, "projects", projectId, "kanban", "board"),
                    {
                      columns: updated,
                    },
                  );

                  setColumnTitle("");
                  setShowColumnInput(false);
                }}
              >
                Add
              </button>
            </div>
          ) : (
            <button onClick={() => setShowColumnInput(true)}>
              <FiPlus />
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default Kanban;