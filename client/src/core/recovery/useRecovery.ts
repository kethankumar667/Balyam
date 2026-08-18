import { useCallback, useSyncExternalStore } from "react";
import { connectionStateManager, type ConnectionState } from "./ConnectionStateManager";
import { recoveryManager } from "./RecoveryManager";

export interface RecoveryHookResult {
  connectionState: ConnectionState;
  isOnline: boolean;
  isRecovering: boolean;
  isFailed: boolean;
  retryRecovery: () => void;
  generateActionId: (prefix?: string) => string;
}

export function useRecovery(): RecoveryHookResult {
  const connectionState = useSyncExternalStore(
    (callback) => connectionStateManager.subscribe(() => callback()),
    () => connectionStateManager.getState(),
    () => "CONNECTED" as ConnectionState
  );

  const isOnline = connectionState === "CONNECTED" || connectionState === "RECOVERED";
  const isRecovering = connectionState === "RECOVERING" || connectionState === "RECONNECTING";
  const isFailed = connectionState === "FAILED";

  const retryRecovery = useCallback(() => {
    recoveryManager.attemptRecovery();
  }, []);

  const generateActionId = useCallback((prefix?: string) => {
    return recoveryManager.generateActionId(prefix);
  }, []);

  return {
    connectionState,
    isOnline,
    isRecovering,
    isFailed,
    retryRecovery,
    generateActionId,
  };
}
