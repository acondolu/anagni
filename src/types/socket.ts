export interface Socket {
  on: (event: any, callback: any) => void;
  emit: (command: any, content: any) => void;
  disconnect: () => void;
  connected: boolean;
}
