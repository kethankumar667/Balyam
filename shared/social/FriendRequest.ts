export type FriendRequestStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  recipientId: string;
  status: FriendRequestStatus;
  createdAt: number;
  updatedAt?: number;
}
