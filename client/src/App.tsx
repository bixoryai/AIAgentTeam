import { Switch, Route } from "wouter";
import Dashboard from "@/pages/Dashboard";
import AgentView from "@/pages/AgentView";
import AllAgents from "@/pages/AllAgents";
import Settings from "@/pages/Settings";
import TeamManagement from "@/components/TeamManagement";
import Sidebar from "@/components/Sidebar";

function App() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/agents" component={AllAgents} />
          <Route path="/agent/:id" component={AgentView} />
          <Route path="/teams" component={TeamManagement} />
          <Route path="/settings" component={Settings} />
        </Switch>
      </main>
    </div>
  );
}

export default App;