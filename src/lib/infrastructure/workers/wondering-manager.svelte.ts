// Shared Web Worker Manager for all clock hands
interface ClockHandData {
	id: string;
	currentAngle: number;
	duration: number;
	callback: (angle: number) => void;
}

class WonderingManager {
	private worker: Worker | null = null;
	private clockHands: Map<string, ClockHandData> = new Map();
	private isWondering = false;

	// Per-cell wondering state
	private boardWidth = 0;
	private boardHeight = 0;
	private cellAngles: number[][] = $state([]); // Store angles instead of rotation types
	private cellIdToPosition: Map<string, { x: number; y: number }> = new Map();
	private listeners: Set<() => void> = new Set();

	private initWorker() {
		if (!this.worker) {
			this.worker = new Worker(new URL('./wondering.worker.ts', import.meta.url), {
				type: 'module'
			});

			this.worker.addEventListener('message', (event) => {
				if (event.data.type === 'tick') {
					const { id, increment } = event.data;

					// Update legacy clock hand (kept for compatibility)
					const clockHand = this.clockHands.get(id);
					if (clockHand) {
						clockHand.currentAngle += increment;
						// Keep angle within reasonable range
						if (clockHand.currentAngle > 3600) {
							clockHand.currentAngle -= 3600;
						}
						clockHand.callback(clockHand.currentAngle);
					}

					// Update per-cell angle for wondering mode
					const pos = this.cellIdToPosition.get(id);
					if (pos) {
						const currentAngle = this.cellAngles[pos.x][pos.y] || 0;
						this.cellAngles[pos.x][pos.y] = currentAngle + increment;
						// Keep angle within reasonable range
						if (this.cellAngles[pos.x][pos.y] > 3600) {
							this.cellAngles[pos.x][pos.y] -= 3600;
						}
						// Notify subscribers (renderer) to refresh views
						for (const listener of this.listeners) listener();
					}
				}
			});
		}
		return this.worker;
	}

	initBoard(width: number, height: number, duration: number = 1200) {
		this.boardWidth = width;
		this.boardHeight = height;
		this.cellAngles = Array.from({ length: width }, () => Array.from({ length: height }, () => 0));
		this.cellIdToPosition.clear();

		// Pre-register all cells with the worker if we're already wondering
		if (this.isWondering) {
			const worker = this.initWorker();
			for (let x = 0; x < width; x++) {
				for (let y = 0; y < height; y++) {
					const id = this.cellId(x, y);
					this.cellIdToPosition.set(id, { x, y });
					worker.postMessage({ type: 'register', id, duration });
					// Initialize with random angle
					this.cellAngles[x][y] = Math.random() * 360;
				}
			}
		}
	}

	cellAngle(x: number, y: number): number {
		if (x < 0 || y < 0 || x >= this.boardWidth || y >= this.boardHeight) return 0;
		return this.cellAngles[x][y] ?? 0;
	}

	private cellId(x: number, y: number) {
		return `${x}:${y}`;
	}

	subscribe(listener: () => void) {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	registerClockHand(
		id: string,
		duration: number,
		callback: (angle: number) => void,
		initialAngle: number = 0
	) {
		const clockHand: ClockHandData = {
			id,
			currentAngle: initialAngle,
			duration,
			callback
		};

		this.clockHands.set(id, clockHand);

		// If we're already wondering, start this clock hand immediately
		if (this.isWondering) {
			const worker = this.initWorker();
			worker.postMessage({
				type: 'register',
				id,
				duration
			});
		}
	}

	unregisterClockHand(id: string) {
		this.clockHands.delete(id);

		if (this.worker) {
			this.worker.postMessage({
				type: 'unregister',
				id
			});
		}

		// If no clock hands left, terminate worker
		if (this.clockHands.size === 0 && this.worker) {
			this.worker.terminate();
			this.worker = null;
		}
	}

	startWondering() {
		if (this.isWondering) return;

		this.isWondering = true;
		const worker = this.initWorker();

		// Register all existing clock hands with the worker
		for (const [id, clockHand] of this.clockHands) {
			worker.postMessage({ type: 'register', id, duration: clockHand.duration });
		}

		// Register all cells for wondering updates
		if (this.boardWidth > 0 && this.boardHeight > 0) {
			for (let x = 0; x < this.boardWidth; x++) {
				for (let y = 0; y < this.boardHeight; y++) {
					const id = this.cellId(x, y);
					this.cellIdToPosition.set(id, { x, y });
					worker.postMessage({ type: 'register', id, duration: 1200 });
				}
			}
		}

		worker.postMessage({ type: 'start' });
	}

	stopWondering() {
		if (!this.isWondering) return;

		this.isWondering = false;

		if (this.worker) {
			this.worker.postMessage({ type: 'stop' });
		}

		// Don't reset angles - let them continue from current position
		// Clear cell registrations
		this.cellIdToPosition.clear();
	}

	updateClockHandAngle(id: string, angle: number) {
		const clockHand = this.clockHands.get(id);
		if (clockHand) {
			clockHand.currentAngle = angle;
		}
	}

	getIsWondering() {
		return this.isWondering;
	}

	cleanup() {
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}
		this.clockHands.clear();
		this.isWondering = false;
	}
}

// Export singleton instance
export const wonderingManager = new WonderingManager();
