import { Provider, UserProvider, ConsumptionHistory, MonthlyConsumption } from '../types';

export const mockProviders: Provider[] = [
  { id: 1, name: 'YAS', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 2, name: 'Starlink', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
];

export const mockUserProviders: UserProvider[] = [
  {
    id: 1,
    user_id: 2,
    provider_id: 1,
    router_ip: '192.168.1.1',
    oid_byte_in: '1.3.6.1.2.1.2.2.1.10',
    oid_byte_out: '1.3.6.1.2.1.2.2.1.16',
    monthly_limit: 100000000000,
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    provider: mockProviders[0],
  },
  {
    id: 2,
    user_id: 2,
    provider_id: 2,
    router_ip: '192.168.1.2',
    oid_byte_in: '1.3.6.1.2.1.2.2.1.10',
    oid_byte_out: '1.3.6.1.2.1.2.2.1.16',
    monthly_limit: 150000000000,
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    provider: mockProviders[1],
  },
  {
    id: 3,
    user_id: 3,
    provider_id: 1,
    router_ip: '192.168.1.3',
    oid_byte_in: '1.3.6.1.2.1.2.2.1.10',
    oid_byte_out: '1.3.6.1.2.1.2.2.1.16',
    monthly_limit: 80000000000,
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    provider: mockProviders[0],
  },
];

const generateConsumptionData = (userId: number, providerId: number, days: number = 30): ConsumptionHistory[] => {
  const data: ConsumptionHistory[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const bytesIn = Math.floor(Math.random() * 5000000000) + 1000000000;
    const bytesOut = Math.floor(Math.random() * 2000000000) + 500000000;

    data.push({
      id: data.length + 1,
      user_id: userId,
      provider_id: providerId,
      bytes_in: bytesIn,
      bytes_out: bytesOut,
      total_bytes: bytesIn + bytesOut,
      date: date.toISOString().split('T')[0],
      created_at: date.toISOString(),
      updated_at: date.toISOString(),
      provider: mockProviders.find(p => p.id === providerId),
    });
  }

  return data;
};

export const mockConsumptionHistory: ConsumptionHistory[] = [
  ...generateConsumptionData(2, 1, 30),
  ...generateConsumptionData(2, 2, 30),
  ...generateConsumptionData(3, 1, 30),
];

export const calculateMonthlyConsumption = (
  userId: number,
  providerId: number,
  month?: string
): MonthlyConsumption => {
  const targetMonth = month || new Date().toISOString().slice(0, 7);

  const monthData = mockConsumptionHistory.filter(
    h => h.user_id === userId &&
         h.provider_id === providerId &&
         h.date.startsWith(targetMonth)
  );

  const totalConsumption = monthData.reduce((sum, h) => sum + h.total_bytes, 0);
  const userProvider = mockUserProviders.find(
    up => up.user_id === userId && up.provider_id === providerId
  );

  const monthlyLimit = userProvider?.monthly_limit || 0;
  const percentageUsed = monthlyLimit > 0 ? (totalConsumption / monthlyLimit) * 100 : 0;
  const isExceeded = totalConsumption > monthlyLimit;

  return {
    user_id: userId,
    provider_id: providerId,
    total_consumption: totalConsumption,
    monthly_limit: monthlyLimit,
    percentage_used: percentageUsed,
    is_exceeded: isExceeded,
    month: targetMonth,
    provider: mockProviders.find(p => p.id === providerId),
  };
};

export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
