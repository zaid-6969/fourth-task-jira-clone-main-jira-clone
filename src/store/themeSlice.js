import { createSlice } from "@reduxjs/toolkit";

const savedTheme = localStorage.getItem("theme");

const themeSlice = createSlice({
  name: "theme",
  initialState: {
    mode: savedTheme ? savedTheme : "dark", 
  },
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === "dark" ? "light" : "dark";
      localStorage.setItem("theme", state.mode);
    },
    setTheme: (state, action) => {
      state.mode = action.payload;
      localStorage.setItem("theme", action.payload); 
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
