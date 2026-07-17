
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { SensorProvider } from "./app/hooks/useSensorData.tsx";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <SensorProvider>
      <App />
    </SensorProvider>
  );
  
