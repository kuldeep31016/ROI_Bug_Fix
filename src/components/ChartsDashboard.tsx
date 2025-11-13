import { Box, Card, CardContent, Typography } from '@mui/material';
import { BarChart, PieChart } from '@mui/x-charts';
import { DerivedTask } from '@/types';

interface Props {
  tasks: DerivedTask[];
}

export default function ChartsDashboard({ tasks }: Props) {
  const revenueByPriority = ['High', 'Medium', 'Low'].map(p => ({
    priority: p,
    revenue: tasks.filter(t => t.priority === (p as any)).reduce((s, t) => s + t.revenue, 0),
  }));
  const revenueByStatus = ['Todo', 'In Progress', 'Done'].map(s => ({
    status: s,
    revenue: tasks.filter(t => t.status === (s as any)).reduce((s2, t) => s2 + t.revenue, 0),
  }));
  const roiBuckets = tasks.reduce(
    (acc, task) => {
      const value = typeof task.roi === 'number' ? task.roi : null;
      if (value == null || !Number.isFinite(value) || Math.abs(value) < Number.EPSILON) {
        acc['N/A'] += 1;
        return acc;
      }
      if (value < 200) {
        acc['<200'] += 1;
      } else if (value <= 500) {
        acc['200-500'] += 1;
      } else {
        acc['>500'] += 1;
      }
      return acc;
    },
    {
      '<200': 0,
      '200-500': 0,
      '>500': 0,
      'N/A': 0,
    } as Record<'<200' | '200-500' | '>500' | 'N/A', number>
  );

  const roiBucketList = Object.entries(roiBuckets).map(([label, count]) => ({ label, count }));

  if (import.meta.env.DEV) {
    console.log('[Charts] ROI buckets', roiBuckets);
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>Insights</Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              md: '1fr 1fr',
            },
          }}
        >
          <Box>
            <Typography variant="body2" color="text.secondary">Revenue by Priority</Typography>
            <BarChart
              height={240}
              xAxis={[{ scaleType: 'band', data: revenueByPriority.map(d => d.priority) }]}
              series={[{ data: revenueByPriority.map(d => d.revenue), color: '#4F6BED' }]}
            />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Revenue by Status</Typography>
            <PieChart
              height={240}
              series={[{
                data: revenueByStatus.map((d, i) => ({ id: i, label: d.status, value: d.revenue })),
              }]}
            />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">ROI Distribution</Typography>
            <BarChart
              height={240}
              xAxis={[{ scaleType: 'band', data: roiBucketList.map(b => b.label) }]}
              series={[{ data: roiBucketList.map(b => b.count), color: '#22A699' }]}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}


