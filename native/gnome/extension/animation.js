// The Catjang Electron spring constants, integrated at a fixed 60 Hz.
export class Accordion {
    constructor() { this.t = 0; this.tv = 0; this.angle = 0; this.angularVelocity = 0;
        this.dx = Array(16).fill(0); this.velocity = Array(16).fill(0);
        this.previousDx = 0; this.kick = 0; this.held = 0; this.releasing = false; this.accumulator = 0; }
    move(dx) {
        const bounded = Math.max(-80, Math.min(80, dx));
        this.angularVelocity += (bounded - this.previousDx) * .065;
        this.previousDx = bounded; this.kick = bounded;
    }
    release() { this.releasing = true; this.tv = -this.t * .55; this.kick = 0;
        this.dx.fill(0); this.velocity.fill(0); }
    update(seconds, maxExtension = 1) {
        this.accumulator += Math.min(.1, seconds);
        while (this.accumulator >= 1 / 60) {
            this.accumulator -= 1 / 60;
            if (this.releasing) { this.tv = (this.tv - this.t * .13) * .78; this.t += this.tv; }
            else { this.held += 1000 / 60; this.t = (1 - (1 - Math.min(1, this.held / 260)) ** 2.4) * maxExtension; }
            this.angularVelocity = (this.angularVelocity - this.angle * (this.releasing ? .003 : .018)) * (this.releasing ? .962 : .86);
            this.angle = Math.max(-45, Math.min(45, this.angle + this.angularVelocity));
            const pendulum = Math.sin(this.angle * Math.PI / 180) * 22;
            for (let index = 0; index < 16; index++) {
                const depth = index / 15; const previous = Math.max(0, index - 1) / 15;
                const target = pendulum * (depth * depth - previous * previous);
                this.velocity[index] = (this.velocity[index] + (target - this.dx[index]) * .038) * .93;
                this.dx[index] = Math.max(-2.5, Math.min(2.5, this.dx[index] + this.velocity[index]));
            }
            if (!this.releasing && Math.abs(this.kick) > 6) {
                this.velocity[0] -= Math.sign(this.kick) * Math.abs(this.kick) ** 1.3 * .008;
                this.kick *= .6;
            }
            this.previousDx *= .78;
        }
        return this.t;
    }
    offsets() { let accumulated = 0; return this.dx.map(value => { accumulated += value; return accumulated; }); }
}

// Electron's shake energy plus a deliberate orbit around the pet. Sampling
// uses time and screen pixels so it behaves consistently at different sizes.
export class HuntingMotion {
    constructor() { this.reset(); }
    reset() { this.previous = null; this.energy = 0; this.orbit = null; }
    sample(x, y, centerX, centerY, size, now) {
        const previous = this.previous;
        this.previous = {x, y, vx: 0, vy: 0, time: now};
        if (!previous || now - previous.time > 150) { this.orbit = null; return false; }
        const dt = Math.max(1, now - previous.time);
        const vx = (x - previous.x) / dt * 16, vy = (y - previous.y) / dt * 16;
        this.previous.vx = vx; this.previous.vy = vy;
        const speed = Math.hypot(vx, vy), previousSpeed = Math.hypot(previous.vx, previous.vy);
        const acceleration = Math.max(0, speed - previousSpeed);
        const reversed = speed > 0 && previousSpeed > 0 && (vx * previous.vx + vy * previous.vy) / (speed * previousSpeed) < -.28;
        this.energy *= Math.pow(.82, dt / 16);
        if (speed > 11.2) {
            let gain = Math.min(.22, (speed - 11.2) / 42);
            if (reversed && speed > 11.2 * 1.28) gain += Math.min(.42, (speed - 11.2) / 34 + .12);
            if (acceleration > 14) gain += Math.min(.18, acceleration / 52);
            if (speed > 11.2 * 3.2 && acceleration > 18) gain += .28;
            this.energy += gain * dt / 16;
        }
        const radius = Math.hypot(x-centerX, y-centerY), angle = Math.atan2(y-centerY, x-centerX);
        let orbitTriggered = false;
        if (radius < size * .28 || radius > size * 2.5) this.orbit = null;
        else {
            let orbit = this.orbit;
            if (!orbit || now-orbit.start > 2600 || now-orbit.moved > 450)
                orbit = this.orbit = {angle, turn: 0, distance: 0, start: now, moved: now};
            const change = Math.atan2(Math.sin(angle-orbit.angle), Math.cos(angle-orbit.angle));
            orbit.angle = angle;
            if (Math.abs(change) > Math.PI / 2) this.orbit = null;
            else if (Math.abs(change) > .008) {
                if (change * orbit.turn < 0) { orbit.turn = 0; orbit.distance = 0; orbit.start = now; }
                orbit.turn += change; orbit.distance += Math.hypot(x-previous.x, y-previous.y); orbit.moved = now;
                orbitTriggered = Math.abs(orbit.turn) >= Math.PI * 1.5 && orbit.distance >= size * 1.1 && now-orbit.start >= 200;
            }
        }
        if (this.energy >= 2.34 || orbitTriggered) {
            this.energy = 2.34 * .35; this.orbit = null; return true;
        }
        return false;
    }
}
