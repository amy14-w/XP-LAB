import { useNavigate, useParams } from 'react-router-dom';
import { BookOpen, Users, BarChart3, TrendingUp, Clock, MessageCircle, AlertCircle, CheckCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Analytics = () => {
  const navigate = useNavigate();
  const { lectureId } = useParams();

  const lectureData = {
    topic: 'Binary Search Trees',
    date: 'November 14, 2025',
    duration: '52 min',
    studentsPresent: 42,
    totalStudents: 45,
    engagementScore: 82,
    participationRate: 67,
  };

  const engagementTimeline = [
    { time: '0', engagement: 95 },
    { time: '5', engagement: 88 },
    { time: '10', engagement: 75 },
    { time: '15', engagement: 82 },
    { time: '20', engagement: 78 },
    { time: '25', engagement: 85 },
    { time: '30', engagement: 80 },
    { time: '35', engagement: 72 },
    { time: '40', engagement: 78 },
    { time: '45', engagement: 84 },
    { time: '50', engagement: 90 },
  ];

  const talkTimeData = [
    { name: 'Professor', value: 68, color: '#06B6D4' },
    { name: 'Students', value: 32, color: '#10B981' },
  ];

  const participationByStudent = [
    { name: 'Sarah Chen', count: 8 },
    { name: 'Emily Rodriguez', count: 6 },
    { name: 'Mike Thompson', count: 5 },
    { name: 'Lisa Wang', count: 4 },
    { name: 'David Park', count: 3 },
    { name: 'Others', count: 12 },
  ];

  const confusionSpikes = [
    { time: '12:15', topic: 'Tree rotation explanation', severity: 'high' },
    { time: '28:30', topic: 'Time complexity analysis', severity: 'medium' },
    { time: '38:45', topic: 'Implementation details', severity: 'low' },
  ];

  const insights = [
    {
      type: 'positive',
      icon: CheckCircle,
      message: 'Great job! Student engagement remained above 75% throughout the lecture.',
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      type: 'info',
      icon: MessageCircle,
      message: '32% student talk time is excellent. Students were actively participating.',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      type: 'warning',
      icon: AlertCircle,
      message: 'Consider reviewing tree rotation concepts - students showed confusion at 12:15.',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      type: 'tip',
      icon: TrendingUp,
      message: 'Your pacing improved in the second half. Keep using those examples!',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
  ];

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            <span className="text-slate-300">XP</span>
            <span className="text-cyan-400">LAB</span>
          </h1>
          <button
            onClick={() => navigate('/professor/dashboard')}
            className="btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <div className="w-64 bg-slate-800/30 border-r border-slate-700 p-6">
          <nav className="space-y-2">
            <button
              onClick={() => navigate('/professor/dashboard')}
              className="nav-item w-full"
            >
              <BookOpen size={20} />
              <span>CLASSES</span>
            </button>
            <button className="nav-item nav-item-active w-full">
              <BarChart3 size={20} />
              <span>ANALYTICS</span>
            </button>
            <button className="nav-item w-full">
              <Users size={20} />
              <span>STUDENTS</span>
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {/* Lecture Header */}
            <div className="glass-card p-6 mb-8">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">{lectureData.topic}</h2>
                  <p className="text-slate-400">{lectureData.date} • CSC2720</p>
                </div>
                <div className="flex gap-6">
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Duration</p>
                    <p className="text-2xl font-bold">{lectureData.duration}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Attendance</p>
                    <p className="text-2xl font-bold text-green-400">
                      {lectureData.studentsPresent}/{lectureData.totalStudents}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm text-slate-400">Engagement Score</h3>
                  <TrendingUp className="text-green-400" size={20} />
                </div>
                <p className="text-4xl font-bold text-cyan-400">{lectureData.engagementScore}%</p>
                <div className="mt-3 w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-cyan-500 h-2 rounded-full transition-all"
                    style={{ width: `${lectureData.engagementScore}%` }}
                  />
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm text-slate-400">Participation Rate</h3>
                  <MessageCircle className="text-green-400" size={20} />
                </div>
                <p className="text-4xl font-bold text-green-400">{lectureData.participationRate}%</p>
                <div className="mt-3 w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${lectureData.participationRate}%` }}
                  />
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm text-slate-400">Talk Time Ratio</h3>
                  <Clock className="text-blue-400" size={20} />
                </div>
                <p className="text-2xl font-bold">
                  <span className="text-cyan-400">68</span>
                  <span className="text-slate-400">/</span>
                  <span className="text-green-400">32</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">Professor / Students</p>
              </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="glass-card p-6">
                <h3 className="text-xl font-bold mb-4">Engagement Timeline</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={engagementTimeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" stroke="#9CA3AF" label={{ value: 'Minutes', position: 'insideBottom', offset: -5 }} />
                    <YAxis stroke="#9CA3AF" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="engagement"
                      stroke="#06B6D4"
                      strokeWidth={3}
                      dot={{ fill: '#06B6D4', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card p-6">
                <h3 className="text-xl font-bold mb-4">Talk Time Distribution</h3>
                <div className="flex items-center justify-center h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={talkTimeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {talkTimeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col gap-2 ml-8">
                    {talkTimeData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-sm">{entry.name}: {entry.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Participation Chart */}
            <div className="glass-card p-6 mb-8">
              <h3 className="text-xl font-bold mb-4">Top Participants</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={participationByStudent} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9CA3AF" />
                  <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={120} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" fill="#10B981" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Confusion Spikes */}
            <div className="glass-card p-6 mb-8">
              <h3 className="text-xl font-bold mb-4">Confusion Spikes Detected</h3>
              <div className="space-y-3">
                {confusionSpikes.map((spike, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      spike.severity === 'high'
                        ? 'bg-red-500/10 border border-red-500/30'
                        : spike.severity === 'medium'
                        ? 'bg-yellow-500/10 border border-yellow-500/30'
                        : 'bg-blue-500/10 border border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <AlertCircle
                        className={
                          spike.severity === 'high'
                            ? 'text-red-400'
                            : spike.severity === 'medium'
                            ? 'text-yellow-400'
                            : 'text-blue-400'
                        }
                        size={24}
                      />
                      <div>
                        <p className="font-semibold">{spike.topic}</p>
                        <p className="text-sm text-slate-400">At {spike.time}</p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        spike.severity === 'high'
                          ? 'bg-red-500/20 text-red-400'
                          : spike.severity === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {spike.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Insights */}
            <div className="glass-card p-6">
              <h3 className="text-xl font-bold mb-4">AI Insights & Recommendations</h3>
              <div className="space-y-3">
                {insights.map((insight, index) => {
                  const Icon = insight.icon;
                  return (
                    <div
                      key={index}
                      className={`flex items-start gap-4 p-4 rounded-lg ${insight.bg} border border-${insight.color}/30`}
                    >
                      <Icon className={insight.color} size={24} />
                      <p className="flex-1">{insight.message}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
