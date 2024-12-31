import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Agent } from "@db/schema";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AgentAnalyticsProps {
  agent: Agent;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function AgentAnalytics({ agent }: AgentAnalyticsProps) {
  const {
    totalPosts,
    totalWordCount,
    averageWordCount,
    successRate,
    averageGenerationTime,
    topicDistribution,
  } = agent.analyticsMetadata;

  // Transform topic distribution for pie chart
  const topicData = Object.entries(topicDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  // Performance metrics for bar chart
  const performanceData = [
    { name: "Success Rate", value: successRate },
    { name: "Avg Generation Time (s)", value: averageGenerationTime },
    { name: "Avg Word Count", value: averageWordCount },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Overview</h4>
            <dl className="grid grid-cols-2 gap-1 text-sm">
              <dt className="text-muted-foreground">Total Posts:</dt>
              <dd>{totalPosts}</dd>
              <dt className="text-muted-foreground">Total Words:</dt>
              <dd>{totalWordCount.toLocaleString()}</dd>
              <dt className="text-muted-foreground">Average Words/Post:</dt>
              <dd>{Math.round(averageWordCount)}</dd>
              <dt className="text-muted-foreground">Success Rate:</dt>
              <dd>{successRate}%</dd>
              <dt className="text-muted-foreground">Avg Generation Time:</dt>
              <dd>{averageGenerationTime.toFixed(1)}s</dd>
            </dl>
          </div>

          <div className="h-48">
            <h4 className="text-sm font-medium mb-2">Performance Metrics</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {topicData.length > 0 && (
            <div className="h-48 col-span-2">
              <h4 className="text-sm font-medium mb-2">Topic Distribution</h4>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topicData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => entry.name}
                  >
                    {topicData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
