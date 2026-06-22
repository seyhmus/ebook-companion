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
    if (this.isProcessing) {
      console.log("DEBUG [Queue]: Busy, skipping/waiting...");
      return;
    }
    if (this.queue.length === 0) {
      console.log("DEBUG [Queue]: Empty, nothing to process");
      return;
    }

    this.isProcessing = true;
    console.log("DEBUG [Queue]: Starting task. Remaining queue size:", this.queue.length);
    const currentTask = this.queue.shift();

    if (currentTask) {
      try {
        await currentTask();
        console.log("DEBUG [Queue]: Task completed successfully");
      } catch (error) {
        console.error("DEBUG [Queue]: Failed task:", error);
      } finally {
        setTimeout(() => {
          this.isProcessing = false;
          console.log("DEBUG [Queue]: Cooling down finished, checking next...");
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