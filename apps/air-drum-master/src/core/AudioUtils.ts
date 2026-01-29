export class AudioUtils {
  private static context: AudioContext | null = null;

  static getContext(): AudioContext {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Resume context if it's suspended (browsers block audio until user interaction)
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    
    return this.context;
  }
}
