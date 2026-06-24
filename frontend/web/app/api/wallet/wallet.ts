import { baseUrl } from "../base";

async function GetAllWallets(token?: string | null) {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/wallets`,
            {
                method: "GET",
                credentials: "include",
            },
        );
        if (!response.ok) {
            const errBody = await response.json().catch(() => ({})) as { error: string };
            throw new Error(errBody.error || `HTTP error ${response.status}`);
        }
        return response.json()
    }
    catch (error) {
        console.error("Error getting all wallets:", error)
        throw error
    }
}

async function GetWallet(wallet_id: string) {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/wallets/${wallet_id}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            },
        );
        if (!response.ok) {
            const errBody = await response.json().catch(() => ({})) as { error: string };
            throw new Error(errBody.error || `HTTP error ${response.status}`);
        }
        return response.json()
    }
    catch (error) {
        console.error("Error getting wallet:", error)
        throw error
    }
}

export interface CreateWalletPayload {
    wallet_name: string;
    initial_balance?: number;
    currency?: string;
    id?: string;
    idempotency_key?: string;
}

async function CreateWallet(data: CreateWalletPayload, token?: string | null) {
    try {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) {
            headers["Authorization"] = `Bearer ${token}`
        }
        const response = await fetch(
            `${baseUrl}/api/v1/wallets`,
            {
                method: "POST",
                credentials: "include",
                headers,
                body: JSON.stringify(data),
            },
        );
        if (!response.ok) {
            const errBody = await response.json().catch(() => ({})) as { error: string };
            throw new Error(errBody.error || `HTTP error ${response.status}`);
        }
        return response.json()
    }
    catch (error) {
        console.error("Error creating wallet:", error)
        throw error
    }
}

async function DeleteWallet(wallet_id: string) {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/wallets/${wallet_id}`,
            {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            },
        );
        if (!response.ok) {
            const errBody = await response.json().catch(() => ({})) as { error: string };
            throw new Error(errBody.error || `HTTP error ${response.status}`);
        }
        return response.json()
    }
    catch (error) {
        console.error("Error deleting wallet:", error)
        throw error
    }
}

export interface UpdateWalletPayload {
    wallet_name?: string;
    currency?: string;
}

async function UpdateWallet(wallet_id: string, data: UpdateWalletPayload, token?: string | null) {
    try {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) {
            headers["Authorization"] = `Bearer ${token}`
        }
        const response = await fetch(
            `${baseUrl}/api/v1/wallets/${wallet_id}`,
            {
                method: "PUT",
                headers,
                body: JSON.stringify(data),
                credentials: "include",
            },
        );
        if (!response.ok) {
            const errBody = await response.json().catch(() => ({})) as { error: string };
            throw new Error(errBody.error || `HTTP error ${response.status}`);
        }
        return response.json()
    }
    catch (error) {
        console.error("Error updating wallet:", error)
        throw error
    }
}

async function GetWalletMembers(wallet_id: string) {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/wallets/${wallet_id}/members`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            },
        );
        if (!response.ok) {
            const errBody = await response.json().catch(() => ({})) as { error: string };
            throw new Error(errBody.error || `HTTP error ${response.status}`);
        }
        return response.json()
    }
    catch (error) {
        console.error("Error getting wallet members:", error)
        throw error
    }
}

async function AddMemberToWallet(wallet_id: string, member_id: string) {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/wallets/${wallet_id}/members/${member_id}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            },
        );
        if (!response.ok) {
            const errBody = await response.json().catch(() => ({})) as { error: string };
            throw new Error(errBody.error || `HTTP error ${response.status}`);
        }
        return response.json()
    }
    catch (error) {
        console.error("Error adding member to wallet:", error)
        throw error
    }
}

async function RemoveMemberFromWallet(wallet_id: string, member_id: string) {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/wallets/${wallet_id}/members/${member_id}`,
            {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            },
        );
        if (!response.ok) {
            const errBody = await response.json().catch(() => ({})) as { error: string };
            throw new Error(errBody.error || `HTTP error ${response.status}`);
        }
        return response.json()
    }
    catch (error) {
        console.error("Error removing member from wallet:", error)
        throw error
    }
}

async function AllocateBalance(wallet_id: string, user_id: string, allocation_limit: number) {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/wallets/${wallet_id}/allocate`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ user_id, allocation_limit }),
                credentials: "include",
            },
        );
        if (!response.ok) {
            const errBody = await response.json().catch(() => ({})) as { error: string };
            throw new Error(errBody.error || `HTTP error ${response.status}`);
        }
        return response.json()
    }
    catch (error) {
        console.error("Error allocating balance:", error)
        throw error
    }
}

async function AdjustBalance(wallet_id: string, amount: number) {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/wallets/${wallet_id}/adjust`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ amount }),
                credentials: "include",
            },
        );
        if (!response.ok) {
            const errBody = await response.json().catch(() => ({})) as { error: string };
            throw new Error(errBody.error || `HTTP error ${response.status}`);
        }
        return response.json()
    }
    catch (error) {
        console.error("Error adjusting balance:", error)
        throw error
    }
}

async function GetWalletInvitation(wallet_id: string) {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/wallets/${wallet_id}/invitation`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            },
        );
        if (!response.ok) {
            const errBody = await response.json().catch(() => ({})) as { error: string };
            throw new Error(errBody.error || `HTTP error ${response.status}`);
        }
        return response.json()
    }
    catch (error) {
        console.error("Error getting wallet invitation:", error)
        throw error
    }
}

async function RegenerateWalletInvitation(wallet_id: string) {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/wallets/${wallet_id}/invitation/regenerate`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            },
        );
        if (!response.ok) {
            const errBody = await response.json().catch(() => ({})) as { error: string };
            throw new Error(errBody.error || `HTTP error ${response.status}`);
        }
        return response.json()
    }
    catch (error) {
        console.error("Error regenerating wallet invitation:", error)
        throw error
    }
}

async function RequestJoinWallet(invitation_code: string) {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/wallets/join`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ invitation_code }),
                credentials: "include",
            },
        );
        if (!response.ok) {
            const errBody = await response.json().catch(() => ({})) as { error: string };
            throw new Error(errBody.error || `HTTP error ${response.status}`);
        }
        return response.json()
    }
    catch (error) {
        console.error("Error requesting join wallet:", error)
        throw error
    }
}

async function GetWalletJoinRequests(wallet_id: string) {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/wallets/${wallet_id}/join-requests`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            },
        );
        if (!response.ok) {
            const errBody = await response.json().catch(() => ({})) as { error: string };
            throw new Error(errBody.error || `HTTP error ${response.status}`);
        }
        return response.json()
    }
    catch (error) {
        console.error("Error getting wallet join requests:", error)
        throw error
    }
}

async function ApproveJoinRequest(wallet_id: string, join_request_id: string, allocation_limit: number = 0, permission: any = { manage_user: true, allocate_balance: true, generate_report: true }) {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/wallets/join/${join_request_id}/approve`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    allocation_limit,
                    permission,
                }),
                credentials: "include",
            },
        );
        if (!response.ok) {
            const errBody = await response.json().catch(() => ({})) as { error: string };
            throw new Error(errBody.error || `HTTP error ${response.status}`);
        }
        return response.json()
    }
    catch (error) {
        console.error("Error approving join request:", error)
        throw error
    }
}

async function RejectJoinRequest(wallet_id: string, join_request_id: string) {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/wallets/join/${join_request_id}/reject`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            },
        );
        if (!response.ok) {
            const errBody = await response.json().catch(() => ({})) as { error: string };
            throw new Error(errBody.error || `HTTP error ${response.status}`);
        }
        return response.json()
    }
    catch (error) {
        console.error("Error rejecting join request:", error)
        throw error
    }
}

async function GetWalletPendingJoinRequests() {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/wallets/join/pending`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            },
        );
        if (!response.ok) {
            const errBody = await response.json().catch(() => ({})) as { error: string };
            throw new Error(errBody.error || `HTTP error ${response.status}`);
        }
        return response.json()
    }
    catch (error) {
        console.error("Error getting pending join requests:", error)
        throw error
    }
}

export {
    GetAllWallets,
    GetWallet,
    CreateWallet,
    DeleteWallet,
    UpdateWallet,
    GetWalletMembers,
    AddMemberToWallet,
    RemoveMemberFromWallet,
    AllocateBalance,
    AdjustBalance,
    GetWalletInvitation,
    RegenerateWalletInvitation,
    RequestJoinWallet,
    GetWalletJoinRequests,
    GetWalletPendingJoinRequests,
    ApproveJoinRequest,
    RejectJoinRequest,
}