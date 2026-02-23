import api from "./api";
import type {ApiResponse, User, UpdateMyProfilePayload} from "../types";

export type LoginResponse = {
    data?: {
        token?: string;
        user?: User;
    };
};

export async function loginRequest(login: string, password: string) {
    const { data } = await api.post<LoginResponse>("/login", {
        email_or_username: login,
        password,
    });
    return data;
}

export async function meRequest(): Promise<User> {
    const res = await api.get<ApiResponse<User>>("/me");
    return res.data.data;
}

export async function logoutRequest() {
    await api.post("/logout");
}

export async function updateProfileRequest(userId: number, payload: Partial<User>) {
    const { data } = await api.put<User>(`/users/${userId}`, payload);
    return data;
}

export async function updatePasswordRequest(
    userId: number,
    currentPassword: string,
    newPassword: string
) {
    await api.post(`/users/${userId}/update-password`, {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: newPassword,
    });
}

export async function updateMyProfileRequest(payload: UpdateMyProfilePayload) {
    const form = new FormData();

    if (payload.name !== undefined) form.append("name", payload.name);
    if (payload.username !== undefined) form.append("username", payload.username);
    if (payload.email !== undefined) form.append("email", payload.email);
    if (payload.phone !== undefined) form.append("phone", payload.phone);

    if (payload.profile_image) {
        form.append("profile_image", payload.profile_image);
    }

    const res = await api.post<ApiResponse<User>>("/me/profile", form, {
        headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data.data;
}

export async function updateMyPasswordRequest(currentPassword: string, newPassword: string) {
    await api.post("/me/password", {
        current_password: currentPassword,
        new_password: newPassword,
    });
}