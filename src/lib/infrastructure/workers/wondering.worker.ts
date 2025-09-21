// Web Worker for handling wondering mode intervals for multiple clock hands
interface WonderingMessage {
	type: 'start' | 'stop' | 'register' | 'unregister';
	id?: string;
	duration?: number;
}

interface WonderingResponse {
	type: 'tick';
	id: string;
	increment: number;
}

interface ClockHandInfo {
	id: string;
	duration: number;
	interval: NodeJS.Timeout | null;
}

const clockHands: Map<string, ClockHandInfo> = new Map();
let isRunning = false;

self.addEventListener('message', (event: MessageEvent<WonderingMessage>) => {
	const { type, id, duration } = event.data;

	switch (type) {
		case 'register': {
			if (!id) return;

			const clockHandInfo: ClockHandInfo = {
				id,
				duration: duration || 1200,
				interval: null
			};

			clockHands.set(id, clockHandInfo);

			// If we're already running, start this clock hand immediately
			if (isRunning) {
				startClockHand(clockHandInfo);
			}
			break;
		}

		case 'unregister': {
			if (!id) return;

			const clockHand = clockHands.get(id);
			if (clockHand && clockHand.interval) {
				clearInterval(clockHand.interval);
			}
			clockHands.delete(id);
			break;
		}

		case 'start': {
			isRunning = true;

			// Start all registered clock hands
			for (const clockHand of clockHands.values()) {
				startClockHand(clockHand);
			}
			break;
		}

		case 'stop': {
			isRunning = false;

			// Stop all clock hands
			for (const clockHand of clockHands.values()) {
				if (clockHand.interval) {
					clearInterval(clockHand.interval);
					clockHand.interval = null;
				}
			}
			break;
		}
	}
});

function startClockHand(clockHandInfo: ClockHandInfo) {
	if (clockHandInfo.interval) {
		clearInterval(clockHandInfo.interval);
	}

	const tick = () => {
		// Generate random increment between 45-360 degrees for clockwise rotation
		const increment = Math.random() * 315 + 45; // 45-360 degrees

		const response: WonderingResponse = {
			type: 'tick',
			id: clockHandInfo.id,
			increment
		};

		self.postMessage(response);
	};

	tick();
	clockHandInfo.interval = setInterval(tick, clockHandInfo.duration);
}

// Clean up on worker termination
self.addEventListener('beforeunload', () => {
	for (const clockHand of clockHands.values()) {
		if (clockHand.interval) {
			clearInterval(clockHand.interval);
		}
	}
	clockHands.clear();
});
