import { createSlice } from "@reduxjs/toolkit";

// 👇 Get theme from localStorage
const savedTheme = localStorage.getItem("theme");

const themeSlice = createSlice({
  name: "theme",
  initialState: {
    mode: savedTheme ? savedTheme : "dark", // 👈 use saved theme
  },
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === "dark" ? "light" : "dark";
      localStorage.setItem("theme", state.mode); // 👈 save after toggle
    },
    setTheme: (state, action) => {
      state.mode = action.payload;
      localStorage.setItem("theme", action.payload); // 👈 save manually set theme
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
