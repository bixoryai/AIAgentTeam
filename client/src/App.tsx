import { Switch, Route } from "wouter";
import Dashboard from "@/pages/Dashboard";
import AgentView from "@/pages/AgentView";
import Sidebar from "@/components/Sidebar";

function App() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/agent/:id" component={AgentView} />
        </Switch>
      </main>
    </div>
  );
}

export default App;
