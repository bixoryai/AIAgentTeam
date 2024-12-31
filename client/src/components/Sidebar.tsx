import { Home, Settings, Users } from "lucide-react";
import { Link } from "wouter";

const navItems = [
  { href: "/", icon: Home, label: "Dashboard" },
  { href: "/agents", icon: Users, label: "All Agents" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-sidebar border-r border-sidebar-border">
      <div className="p-6">
        <h2 className="text-xl font-bold text-sidebar-foreground">AI Manager</h2>
      </div>

      <nav className="px-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center px-4 py-2 my-1 rounded-md transition-colors
              text-sidebar-foreground hover:bg-sidebar-accent/50`}
          >
            <item.icon className="w-5 h-5 mr-3" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}