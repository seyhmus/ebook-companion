type Task = () => Promise<void>;

class GroqQueueProcessor {
  private queue: Task[] = [];
  private isProcessing = false;
  private throttleDelayMs = 800; // Mandatory cooling down window between engine updates

  /**
   * Pushes a background insight calculation request onto the stack line.
   */
  public add(task: Task): void {
    // If the queue starts growing too long from rapid page turns,
    // drop the oldest speculative background tasks to save token allocation.
    if (this.queue.length > 3) {
      this.queue.shift(); 
    }

    this.queue.push(task);
    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const currentTask = this.queue.shift();

    if (currentTask) {
      try {
        await currentTask();
      } catch (error) {
        console.error("Failed executing task in background queue handler:", error);
      } finally {
        // Enforce a strict cooling down phase before opening up the thread to the next task
        setTimeout(() => {
          this.isProcessing = false;
          this.processNext();
        }, this.throttleDelayMs);
      }
    }
  }

  /**
   * Clears all pending speculative background processes instantly (e.g., if switching books).
   */
  public purge(): void {
    this.queue = [];
    this.isProcessing = false;
  }
}

export const groqQueue = new GroqQueueProcessor();