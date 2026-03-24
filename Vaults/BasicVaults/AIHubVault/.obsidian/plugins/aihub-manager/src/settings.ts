export interface AHMSettings {
  /** 자동 감지 실패 시 수동으로 지정하는 멀티볼트 루트 경로 */
  multiVaultRootOverride: string;

  /** PowerShell 스크립트 경로 오버라이드 (자동 감지 실패 시) */
  psScriptOverrides: {
    createVault: string;
    syncWorkspace: string;
    cloneVault: string;
  };
}

export const DEFAULT_SETTINGS: AHMSettings = {
  multiVaultRootOverride: "",
  psScriptOverrides: {
    createVault: "",
    syncWorkspace: "",
    cloneVault: "",
  },
};
