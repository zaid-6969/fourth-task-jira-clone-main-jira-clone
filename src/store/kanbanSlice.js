import { createSlice } from "@reduxjs/toolkit";

const kanbanSlice = createSlice({
  name: "kanban",
  initialState: {
    columns: [],
  },
  reducers: {
    // 🔥 SINGLE SOURCE OF TRUTH
    setColumns: (state, action) => {
      state.columns = action.payload;
    },

    // used when leaving project
    resetKanban: (state) => {
      state.columns = [];
    },
  },
});

export const { setColumns, resetKanban } = kanbanSlice.actions;
export default kanbanSlice.reducer;
