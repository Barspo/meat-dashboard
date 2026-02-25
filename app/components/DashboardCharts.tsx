'use client';

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

// --- גרף מגמה (Area Chart) ---
export const TrendChart = ({ data }: { data: any[] }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value/1000}k`} />
        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
        <Area type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// --- גרף עוגה (Pie Chart) - תיקון: הוספת תוויות ---
export const KosherPieChart = ({ data }: { data: any[] }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
          // כאן התיקון: הוספת לייבלים חיצוניים
          label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={{ stroke: '#94a3b8' }} // צבע הקו המקשר
        >
          {data.map((entry: any, index: number) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
          ))}
        </Pie>
        <Tooltip formatter={(value) => value !== undefined ? `${value.toLocaleString()} kg` : ''} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
        <Legend verticalAlign="bottom" height={36} iconType="circle"/>
      </PieChart>
    </ResponsiveContainer>
  );
};

// --- גרף עמודות (Bar Chart) - תיקון: סידור הטקסט ---
export const FactoryBarChart = ({ data }: { data: any[] }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart 
        data={data} 
        layout="vertical" 
        // כאן התיקון: הוספת שוליים בצד שמאל בשביל הטקסט
        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
        <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />

        <YAxis
          dataKey="name"
          type="category"
          stroke="#334155"
          width={100}
          fontSize={14}
          fontWeight="bold"
          tickLine={false}
          axisLine={false}
        />
        
        <Tooltip cursor={{fill: '#f1f5f9', opacity: 0.6}} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
        <Bar dataKey="production" fill="#10b981" radius={[0, 6, 6, 0]} barSize={35} />
      </BarChart>
    </ResponsiveContainer>
  );
};