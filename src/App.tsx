import { BrowserRouter } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Sidebar />
    </BrowserRouter>
  );
}

export default App;
