import api from './api';
import type {ApiResponse, ClientUser, Provider} from "../types";

export async function listProvidersRequest() {
    const { data } = await api.get<Provider[]>("/providers");
    return data;
}

export async function myListProvidersRequest(userId: number) {
    const { data } = await api.get(`/users/${userId}/active-providers`);
    return data.data;
}

export async function createProviderRequest(payload: Pick<Provider, "name" | "is_active">) {
    const { data } = await api.post<Provider>("/providers", payload);
    return data;
}

export async function updateProviderRequest(
    id: number,
    payload: Pick<Provider, "name" | "is_active">
) {
    const { data } = await api.put<Provider>(`/providers/${id}`, payload);
    return data;
}

export async function deleteProviderRequest(id: number) {
    await api.delete(`/providers/${id}`);
}

export async function listClientsRequest() {
    const { data } = await api.get<ApiResponse<ClientUser[]>>("/users/all/clients");
    return data.data; // => ClientUser[]
}