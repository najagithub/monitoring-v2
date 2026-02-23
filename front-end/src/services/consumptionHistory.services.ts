import api from './api';
import {DailyConsumptionItem, MonthlyConsumptionResponse} from "../types.ts"; // adapte selon ton axios instance


export async function getMonthlyConsumptionRequest(params: {
    user_id: number;
    provider_id: number;
    month: string; // "YYYY-MM"
}): Promise<MonthlyConsumptionResponse> {
    const res = await api.get('/consumption-history/monthly', { params });
    return res.data.data;
}

export async function getDailyConsumptionRequest(params: {
    user_id: number;
    provider_id: number;
    days?: number; // ✅ nouveau param
}): Promise<DailyConsumptionItem[]> {
    const res = await api.get('/consumption-history/daily', { params });
    return res.data.data;
}

export async function getConsumptionHistoryRequest(params: {
    user_id: number;
    provider_id: number;
    start_date: string; // YYYY-MM-DD
    end_date: string;   // YYYY-MM-DD
}): Promise<DailyConsumptionItem[]> {
    const res = await api.get('/consumption-history', { params });
    // ton backend renvoie un array direct, pas data.data
    return res.data.data;
}